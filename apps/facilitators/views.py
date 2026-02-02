import logging
from typing import Dict, Any, List, Optional

from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.db.models import QuerySet, Q, Count
from django.db.models.functions import Lower

import os
import openpyxl
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from datetime import datetime

from .models import Facilitator
from apps.dashboard.models import Activity

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

    if value.lower() == "n/a":
        return Q(**{f"{field_path}__isnull": True})

    if filter_kind == "exact":
        try:
            return Q(**{field_path: value})
        except (ValueError, TypeError):
            return None

    elif filter_kind == "numeric":
        cleaned = value.replace(",", "")
        try:
            if cleaned.startswith("-") and not cleaned.endswith("-"):
                max_val = float(cleaned[1:])
                return Q(**{f"{field_path}__lte": max_val})
            elif cleaned.endswith("-") and not cleaned.startswith("-"):
                min_val = float(cleaned[:-1])
                return Q(**{f"{field_path}__gte": min_val})
            else:
                exact_val = float(cleaned)
                return Q(**{field_path: exact_val})
        except (ValueError, TypeError):
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

        # Column-specific filters (robust: iterate over defined columns)
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

        numeric_fields = {"id", "courses_count"}
        if sort_field in numeric_fields:
            order_expr = f"-{sort_field}" if order_dir == "desc" else sort_field
        else:
            order_expr = Lower(sort_field).desc() if order_dir == "desc" else Lower(sort_field).asc()

        filtered_qs = filtered_qs.order_by(order_expr)

        paged_data = filtered_qs[start : start + length] if length > 0 else filtered_qs

        if length < 0:
            Activity.objects.create(
                categ="facilitator",
                title="Facilitators data exported",
                maelezo="All facilitators table data has been exported"
                )

        return {
            "draw": draw,
            "recordsTotal": total_records,
            "recordsFiltered": filtered_count,
            "data": paged_data,
        }


# =============================================================================
# CRUD Service
# =============================================================================

class FacilitatorService:
    @staticmethod
    def create_from_post(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            name = (data.get("name") or "").strip()
            comment = (data.get("comment") or "").strip()
            comment = None if not comment else comment

            if len(name) < 3:
                return {"success": False, "sms": "Names must have at least 3 characters."}

            if Facilitator.objects.filter(name__iexact=name).exists():
                return {"success": False, "sms": "Facilitator with this name already exists."}

            Facilitator.objects.create(name=name, comment=comment)
            Activity.objects.create(
                categ="facilitator",
                title="New facilitator added",
                maelezo="New facilitator has been registered successfully"
                )
            return {"success": True, "sms": "New facilitator added successfully!"}
        except Exception as e:
            logger.exception("Facilitator creation failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def update_from_post(facilitator_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            facilitator = Facilitator.objects.get(id=facilitator_id)
            name = (data.get("name") or "").strip()
            comment = (data.get("comment") or "").strip()
            comment = None if not comment else comment

            if len(name) < 3:
                return {"success": False, "sms": "Names must have at least 3 characters."}

            if Facilitator.objects.filter(name__iexact=name).exclude(id=facilitator_id).exists():
                return {"success": False, "sms": "Facilitator with this name already exists."}

            facilitator.name = name
            facilitator.comment = comment
            facilitator.save()

            Activity.objects.create(
                categ="facilitator",
                title="Facilitator updated",
                maelezo="Facilitator information has been updated"
                )
            return {"success": True, "sms": "Facilitator details updated successfully!"}
        except Facilitator.DoesNotExist:
            return {"success": False, "sms": "Facilitator not found."}
        except Exception as e:
            logger.exception("Facilitator update failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def delete_by_id(facilitator_id: int) -> Dict[str, Any]:
        try:
            Facilitator.objects.filter(id=facilitator_id).delete()
            Activity.objects.create(
                categ="facilitator",
                title="Facilitator deleted",
                maelezo="One facilitator has been removed from system"
                )
            return {"success": True, "sms": "Facilitator deleted successfully!"}
        except Exception as e:
            logger.exception("Facilitator delete failed")
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
                    comment = str(row[1]).strip() if len(row) > 1 and row[1] else None

                    if len(name) < 3:
                        failed.append({'row': row_num, 'reason': 'Name is too short.'})
                        continue
                    elif Facilitator.objects.filter(name__iexact=name).exists():
                        failed.append({'row': row_num, 'reason': 'Name already exists.'})
                        continue

                    Facilitator.objects.create(name=name, comment=comment)
                    created_count += 1

            wb.close()

            sms = f'Imported {created_count} facilitator(s) successfully.'
            if failed:
                sms += '<br>'
                sms += 'Failed facilitators:<br>' + '<br>'.join([
                    f'Row {f["row"]}: {f["reason"]}'
                    for f in failed
                ])

            success = created_count > 0 and len(failed) == 0
            
            if created_count > 0:
                Activity.objects.create(
                    categ="facilitator",
                    title="Multiple facilitators added",
                    maelezo=f"{created_count} facilitators has been registered from excel sheet"
                    )
                
            return {'success': success, 'sms': sms}

        except Exception as e:
            logger.exception("Facilitators import failed")
            return {'success': False, 'sms': f'Error processing file: {str(e)}'}

    @staticmethod
    def delete_multiple(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            facils = data.get("facilitators_list", "")
            facilitators_list = [int(x) for x in facils.split(",") if x.strip()]
            delete_type = data.get("delete_type")
            
            if delete_type == "all":
                get_all = Facilitator.objects.all()
                if len(get_all) == 0:
                    return {"success": False, "sms": "No facilitators available to delete."}
                
                get_all.delete()
                Activity.objects.create(
                    categ="facilitator", title="All facilitators deleted",
                    maelezo="All facilitators have been erased from system"
                    )
                return {"success": True, "sms": "All facilitators deleted successfully."}
            
            for facil in facilitators_list:
                Facilitator.objects.filter(id=facil).delete()
            Activity.objects.create(
                categ="facilitator", title="Multiple facilitators deleted",
                maelezo=f"{len(facilitators_list)} facilitators have been deleted from system"
                )
            return {"success": True, "sms": f"{len(facilitators_list)} facilitators deleted successfully."}
                
        except Exception as e:
            logger.exception("Facilitator delete failed")
            return {"success": False, "sms": "Operation failed."}
        

# =============================================================================
# Views
# =============================================================================

@never_cache
@login_required
def facilitators_page(request: HttpRequest) -> HttpResponse:
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        qs = Facilitator.objects.annotate(courses_count=Count("course")).all()

        column_filter_fields = {
            0: "id",
            1: "name",
            2: "courses_count",
            3: "comment",
        }
        column_sort_fields = column_filter_fields.copy()
        column_filter_types = {
            "id": "exact",
            "name": "contains",
            "courses_count": "numeric",
            "comment": "contains",
        }

        result = DataTableProcessor.process_request(
            request=request,
            queryset=qs,
            global_search_fields=["name", "comment"],
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
                "courses": obj.courses_count,
                "comment": obj.comment or "N/A",
                "action": "",
            }
            for i, obj in enumerate(result["data"])
        ]

        return JsonResponse(
            {
                "draw": result["draw"],
                "recordsTotal": result["recordsTotal"],
                "recordsFiltered": result["recordsFiltered"],
                "data": rows,
            }
        )

    return render(request, "facilitators/facilitators.html")


@never_cache
@login_required
def facilitators_actions(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"success": False, "sms": "Invalid request"})
    
    if 'excel_file' in request.FILES:
        uploaded_file = request.FILES['excel_file']
        now = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        new_filename = f"{now}facilitators{original_ext}"
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'tmp'))
        
        # Save with new name
        filepath = fs.path(fs.save(new_filename, uploaded_file))
        
        try:
            result = FacilitatorService.import_from_excel(filepath)
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
    fac_id = post_data.get("facilitator_id")
    delete_id = post_data.get("delete_id")
    delete_type = post_data.get("delete_type")

    if delete_id:
        return JsonResponse(FacilitatorService.delete_by_id(delete_id))
    if fac_id:
        return JsonResponse(FacilitatorService.update_from_post(int(fac_id), post_data))
    if delete_type:
        return JsonResponse(FacilitatorService.delete_multiple(post_data))
    return JsonResponse(FacilitatorService.create_from_post(post_data))
