import logging
from typing import Dict, Any, List, Optional

from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpRequest, HttpResponse
from django.db.models import QuerySet, Q, Value, CharField
from django.db.models.functions import Lower, Concat

import os
import openpyxl
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from datetime import datetime

from .models import Student
from apps.programs.models import Program

logger = logging.getLogger(__name__)


# =============================================================================
# Database utilities
# =============================================================================

def build_column_filter(
    field_path: str,
    search_value: str,
    filter_kind: str = "contains"
) -> Optional[Q]:
    value = (search_value or "").strip()
    if not value:
        return None
    
    if value.lower() in ("n/a", "na", "none", "-"):
        if field_path in ("program_display", "program__name", "program__abbrev"):
            return Q(program__isnull=True)

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
        sort_field = column_sort_fields.get(order_idx, "fullname")

        order_expr = Lower(sort_field).desc() if order_dir == "desc" else Lower(sort_field).asc()

        filtered_qs = filtered_qs.order_by(order_expr)

        paged_data = filtered_qs[start:start + length] if length > 0 else filtered_qs

        return {
            "draw": draw, "recordsTotal": total_records,
            "recordsFiltered": filtered_count, "data": paged_data,
        }


# =============================================================================
# CRUD Service
# =============================================================================

class StudentService:
    @staticmethod
    def create_from_post(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            fullname = (data.get("fullname") or "").strip()
            regnumber = (data.get("regnumber") or "").strip()
            program_id = data.get("program")

            if len(fullname) < 3:
                return {"success": False, "sms": "Full name must have at least 3 characters."}

            if len(regnumber) < 3:
                return {"success": False, "sms": "Registration number must have at least 3 characters."}

            if Student.objects.filter(regnumber__iexact=regnumber).exists():
                return {"success": False, "sms": "This registration number already exists."}

            program = None
            if program_id:
                try:
                    program = Program.objects.get(id=program_id)
                except Program.DoesNotExist:
                    return {"success": False, "sms": "Selected program not found."}

            Student.objects.create(fullname=fullname, regnumber=regnumber, program=program)
            return {"success": True, "sms": "New student added successfully!"}
        except Exception as e:
            logger.exception("Student creation failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def update_from_post(student_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            student = Student.objects.get(id=student_id)
            fullname = (data.get("fullname") or "").strip()
            regnumber = (data.get("regnumber") or "").strip()
            program_id = data.get("program")

            if len(fullname) < 3:
                return {"success": False, "sms": "Full name must have at least 3 characters."}

            if len(regnumber) < 3:
                return {"success": False, "sms": "Registration number must have at least 3 characters."}

            if Student.objects.filter(regnumber__iexact=regnumber).exclude(id=student_id).exists():
                return {"success": False, "sms": "This registration number already exists."}

            program = None
            if program_id:
                try:
                    program = Program.objects.get(id=program_id)
                except Program.DoesNotExist:
                    return {"success": False, "sms": "Selected program not found."}

            student.fullname = fullname
            student.regnumber = regnumber
            student.program = program
            student.save()

            return {"success": True, "sms": "Student updated successfully!"}
        except Student.DoesNotExist:
            return {"success": False, "sms": "Student not found."}
        except Exception as e:
            logger.exception("Student update failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def delete_by_id(student_id: int) -> Dict[str, Any]:
        try:
            Student.objects.filter(id=student_id).delete()
            return {"success": True, "sms": "Student deleted successfully!"}
        except Exception as e:
            logger.exception("Student delete failed")
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
                    reg = str(row[1] or '').strip() if len(row) > 1 else ''
                    prog = str(row[2]).strip() if len(row) > 2 and row[2] else None
                    
                    if prog:
                        prog = Program.objects.filter(abbrev__iexact=prog).first()

                    if len(name) < 3 or len(reg) < 3:
                        failed.append({'row': row_num, 'reason': 'Name or regnumber is too short.'})
                        continue
                    elif Student.objects.filter(regnumber__iexact=reg).exists():
                        failed.append({'row': row_num, 'reason': 'Regnumber already exists.'})
                        continue

                    Student.objects.create(fullname=name, regnumber=reg, program=prog)
                    created_count += 1

            wb.close()

            sms = f'Imported {created_count} student(s) successfully.'
            if failed:
                sms += '<br>'
                sms += 'Failed students:<br>' + '<br>'.join([
                    f'Row {f["row"]}: {f["reason"]}'
                    for f in failed
                ])

            success = created_count > 0 and len(failed) == 0
            return {'success': success, 'sms': sms}

        except Exception as e:
            logger.exception("Students import failed")
            return {'success': False, 'sms': f'Error processing file: {str(e)}'}


# =============================================================================
# Views
# =============================================================================

@never_cache
@login_required
def students_page(request: HttpRequest) -> HttpResponse:
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        qs = Student.objects.select_related("program").annotate(
            program_display=Concat(
                'program__abbrev', Value(': '), 'program__name', output_field=CharField()
                )).all()

        column_filter_fields = {1: "fullname", 2: "regnumber", 3: "program_display"}
        column_sort_fields = column_filter_fields.copy()
        column_filter_types = {"fullname": "contains", "regnumber": "contains", "program_display": "contains"}

        result = DataTableProcessor.process_request(
            request=request, queryset=qs,
            global_search_fields=["fullname", "regnumber", "program_display"],
            column_filter_fields=column_filter_fields,
            column_filter_types=column_filter_types,
            column_sort_fields=column_sort_fields,
        )

        start_idx = int(request.POST.get("start", 0))
        rows = [
            {
                "count": start_idx + i + 1,
                "id": obj.id,
                "fullname": obj.fullname,
                "regnumber": obj.regnumber,
                "program": obj.program_display if obj.program else "N/A",
                "program_id": obj.program.id if obj.program else "",
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
    
    return render(request, "students/students.html", {"programs": Program.objects.all().order_by("name")})


@never_cache
@login_required
def students_actions(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"success": False, "sms": "Invalid request"})
    
    if 'excel_file' in request.FILES:
        uploaded_file = request.FILES['excel_file']
        now = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        new_filename = f"{now}_students{original_ext}"
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'tmp'))
        
        # Save with new name
        filepath = fs.path(fs.save(new_filename, uploaded_file))
        
        try:
            result = StudentService.import_from_excel(filepath)
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
    student_id = post_data.get("student_id")
    delete_id = post_data.get("delete_id")

    if delete_id:
        return JsonResponse(StudentService.delete_by_id(delete_id))
    if student_id:
        return JsonResponse(StudentService.update_from_post(int(student_id), post_data))
    return JsonResponse(StudentService.create_from_post(post_data))
