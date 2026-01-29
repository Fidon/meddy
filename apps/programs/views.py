import logging
from typing import Dict, Any, List, Optional

from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.db.models import QuerySet, Q
from django.db.models.functions import Lower

import os
import openpyxl
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from datetime import datetime

from .models import Program

logger = logging.getLogger(__name__)


# =============================================================================
# Database utilities
# =============================================================================

def build_column_filter(
    field_path: str, search_value: str, filter_kind: str = "contains"
) -> Optional[Q]:
    value = (search_value or "").strip()
    if not value:
        return None

    return Q(**{f"{field_path}__icontains": value})


class DataTableProcessor:
    @staticmethod
    def process_request(
        request: HttpRequest,
        queryset: QuerySet,
        global_search_fields: List[str],
        column_filter_fields: Dict[int, str],
        column_filter_types: Dict[str, str],
        column_sort_fields: Optional[Dict[int, str]] = None,
    ) -> Dict[str, Any]:
        if column_sort_fields is None:
            column_sort_fields = column_filter_fields

        total_records = queryset.count()

        draw = int(request.POST.get("draw", 1))
        start = int(request.POST.get("start", 0))
        length = int(request.POST.get("length", 10))
        global_search = (request.POST.get("search[value]", "") or "").strip()

        filtered_qs = queryset

        if global_search:
            q_global = Q()
            for field in global_search_fields:
                q_global |= Q(**{f"{field}__icontains": global_search})
            filtered_qs = filtered_qs.filter(q_global)

        # Column-specific filters
        for col_index, field_path in column_filter_fields.items():
            search_val = (request.POST.get(f"columns[{col_index}][search][value]", "") or "").strip()
            if search_val:
                filter_kind = column_filter_types.get(field_path, "contains")
                q_filter = build_column_filter(field_path, search_val, filter_kind)
                if q_filter:
                    filtered_qs = filtered_qs.filter(q_filter)

        filtered_count = filtered_qs.count()

        # Sorting
        order_idx = int(request.POST.get("order[0][column]", 1))
        order_dir = request.POST.get("order[0][dir]", "asc")
        sort_field = column_sort_fields.get(order_idx, "name")

        order_expr = Lower(sort_field).desc() if order_dir == "desc" else Lower(sort_field).asc()

        filtered_qs = filtered_qs.order_by(order_expr)

        paged_data = filtered_qs[start : start + length] if length > 0 else filtered_qs

        return {
            "draw": draw,
            "recordsTotal": total_records,
            "recordsFiltered": filtered_count,
            "data": paged_data,
        }


# =============================================================================
# CRUD Service
# =============================================================================

class ProgramService:
    @staticmethod
    def create_from_post(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            name = (data.get("name") or "").strip()
            abbrev = (data.get("abbrev") or "").strip()
            comment = (data.get("comment") or "").strip()
            comment = None if not comment else comment

            if len(name) < 3:
                return {"success": False, "sms": "Name must have at least 3 characters."}

            if Program.objects.filter(abbrev__iexact=abbrev).exists():
                return {"success": False, "sms": "Program with this abbreviation already exists."}

            Program.objects.create(name=name, abbrev=abbrev, comment=comment)
            return {"success": True, "sms": "New program added successfully!"}
        except Exception as e:
            logger.exception("Program creation failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def update_from_post(program_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            program = Program.objects.get(id=program_id)
            name = (data.get("name") or "").strip()
            abbrev = (data.get("abbrev") or "").strip()
            comment = (data.get("comment") or "").strip()
            comment = None if not comment else comment

            if len(name) < 3:
                return {"success": False, "sms": "Name must have at least 3 characters."}

            if Program.objects.filter(abbrev__iexact=abbrev).exclude(id=program_id).exists():
                return {"success": False, "sms": "Program with this abbreviation already exists."}

            program.name = name
            program.abbrev = abbrev
            program.comment = comment
            program.save()
            return {"success": True, "sms": "Program updated successfully!"}
        except Program.DoesNotExist:
            return {"success": False, "sms": "Program not found."}
        except Exception as e:
            logger.exception("Program update failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def delete_by_id(program_id: int) -> Dict[str, Any]:
        try:
            Program.objects.filter(id=program_id).delete()
            return {"success": True, "sms": "Program deleted successfully!"}
        except Exception as e:
            logger.exception("Program delete failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def import_from_excel(filepath: str) -> Dict[str, Any]:
        created_count = 0
        failed = []
        try:
            if not filepath.lower().endswith(('.xlsx', '.xls')):
                return {"success": False, "sms": "Only Excel files (.xlsx, .xls) are accepted."}

            wb = openpyxl.load_workbook(filepath, read_only=True, data_only=True)
            sheet = wb.active

            with transaction.atomic():
                for row_num, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
                    name = str(row[0] or '').strip() if len(row) > 0 else ''
                    abbrev = str(row[1] or '').strip() if len(row) > 1 else ''
                    comment = str(row[2]).strip() if len(row) > 2 and row[2] else None

                    if len(name) < 3:
                        failed.append({'row': row_num, 'reason': 'Name is too short.'})
                        continue
                    elif not abbrev:
                        failed.append({'row': row_num, 'reason': 'Abbrev is required.'})
                        continue
                    elif Program.objects.filter(abbrev__iexact=abbrev).exists():
                        failed.append({'row': row_num, 'reason': 'Abbrev already exists.'})
                        continue

                    Program.objects.create(name=name, abbrev=abbrev, comment=comment)
                    created_count += 1

            wb.close()

            sms = f'Imported {created_count} program(s) successfully.'
            if failed:
                sms += '<br>'
                sms += 'Failed programs:<br>' + '<br>'.join([
                    f'Row {f["row"]}: {f["reason"]}'
                    for f in failed
                ])

            success = created_count > 0 and len(failed) == 0
            return {'success': success, 'sms': sms}

        except Exception as e:
            logger.exception("Program import failed")
            return {'success': False, 'sms': f'Error processing file: {str(e)}'}


# =============================================================================
# Views
# =============================================================================

@never_cache
@login_required
def programs_page(request: HttpRequest) -> HttpResponse:
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        qs = Program.objects.all()

        column_filter_fields = {1: "name", 2: "abbrev", 3: "comment"}
        column_sort_fields = column_filter_fields.copy()
        column_filter_types = { "name": "contains", "abbrev": "contains", "comment": "contains"}

        result = DataTableProcessor.process_request(
            request=request,
            queryset=qs,
            global_search_fields=["name", "abbrev", "comment"],
            column_filter_fields=column_filter_fields,
            column_filter_types=column_filter_types,
            column_sort_fields=column_sort_fields,
        )

        start_idx = int(request.POST.get("start", 0))
        rows = [
            {
                "count": start_idx + i + 1,
                "id": obj.id,
                "name": obj.name,
                "abbrev": obj.abbrev,
                "comment": obj.comment or "n/a",
                "action": "",
            }
            for i, obj in enumerate(result["data"])
        ]

        return JsonResponse(
            {
                "draw": result["draw"], "recordsTotal": result["recordsTotal"],
                "recordsFiltered": result["recordsFiltered"], "data": rows
            }
        )

    return render(request, "programs/programs.html")


@never_cache
@login_required
def programs_actions(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"success": False, "sms": "Invalid request"})
    
    if 'excel_file' in request.FILES:
        uploaded_file = request.FILES['excel_file']
        now = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        new_filename = f"{now}_courses{original_ext}"
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'tmp'))
        
        # Save with new name
        filepath = fs.path(fs.save(new_filename, uploaded_file))
        
        try:
            result = ProgramService.import_from_excel(filepath)
            return JsonResponse(result)
        finally:
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                except (PermissionError, OSError):
                    # Silently ignore
                    pass
                except Exception as e:
                    logger.warning(f"Could not delete temp file {filepath}: {e}")

    post_data = request.POST
    prog_id = post_data.get("program_id")
    delete_id = post_data.get("delete_id")

    if delete_id:
        return JsonResponse(ProgramService.delete_by_id(delete_id))
    if prog_id:
        return JsonResponse(ProgramService.update_from_post(int(prog_id), post_data))
    return JsonResponse(ProgramService.create_from_post(post_data))