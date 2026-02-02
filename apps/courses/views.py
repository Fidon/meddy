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

from .models import Course
from apps.facilitators.models import Facilitator
from apps.dashboard.models import Activity

logger = logging.getLogger(__name__)


# =============================================================================
#  Database / Query utilities
# =============================================================================

def build_column_filter(
    field_path: str,
    search_value: str,
    filter_kind: str = "contains",
) -> Optional[Q]:
    """
    Build a Q object for column-specific filtering.
    Supports:
      - 'contains' / 'icontains' for text
      - 'exact' for IDs / foreign keys / booleans
      - Special 'n/a' → IS NULL
    """
    value = (search_value or "").strip()
    if not value:
        return None

    if value.lower() == "n/a":
        return Q(**{f"{field_path}__isnull": True})

    if filter_kind == "exact":
        return Q(**{field_path: value})

    return Q(**{f"{field_path}__icontains": value})


class DataTableProcessor:
    """
    Handles server-side processing for DataTables:
    filtering, sorting, pagination, counting — all at database level.
    """

    @staticmethod
    def process_request(
        request: HttpRequest,
        queryset: QuerySet,
        global_search_fields: List[str],
        column_filter_fields: Dict[int, str],
        column_filter_types: Dict[str, str],
        column_sort_fields: Optional[Dict[int, str]] = None,
    ) -> Dict[str, Any]:
        """
        Main entry point.
        column_sort_fields defaults to column_filter_fields if not provided.
        """
        if column_sort_fields is None:
            column_sort_fields = column_filter_fields

        # ── 1. Total records (unfiltered) ───────────────────────────────
        total_records = queryset.count()

        # ── 2. Read DataTables parameters ───────────────────────────────
        draw = int(request.POST.get("draw", 1))
        start = int(request.POST.get("start", 0))
        length = int(request.POST.get("length", 10))
        global_search = (request.POST.get("search[value]", "") or "").strip()

        filtered_qs = queryset

        # ── 3. Global search ────────────────────────────────────────────
        if global_search:
            q_global = Q()
            for field in global_search_fields:
                q_global |= Q(**{f"{field}__icontains": global_search})
            filtered_qs = filtered_qs.filter(q_global)

        # ── 4. Column-specific filters ──────────────────────────────────
        for col_index, field_path in column_filter_fields.items():
            search_val = (request.POST.get(f"columns[{col_index}][search][value]", "") or "").strip()
            if not search_val:
                continue

            filter_kind = column_filter_types.get(field_path, "contains")
            q_filter = build_column_filter(field_path, search_val, filter_kind)

            if q_filter is not None:
                filtered_qs = filtered_qs.filter(q_filter)

        filtered_count = filtered_qs.count()

        # ── 5. Sorting ──────────────────────────────────────────────────
        order_column_idx = int(request.POST.get("order[0][column]", 1))
        order_direction = request.POST.get("order[0][dir]", "asc")
        sort_field = column_sort_fields.get(order_column_idx, "created_at")

        if sort_field == "created_at":
            order_by_expr = f"-{sort_field}" if order_direction == "desc" else sort_field
        else:
            order_by_expr = Lower(sort_field).desc() if order_direction == "desc" else Lower(sort_field).asc()

        filtered_qs = filtered_qs.order_by(order_by_expr)

        # ── 6. Pagination ───────────────────────────────────────────────
        page_data = filtered_qs[start : start + length] if length > 0 else filtered_qs

        if length < 0:
            Activity.objects.create(
                categ="course",
                title="Courses data exported",
                maelezo="All courses table data has been exported"
                )

        return {
            "draw": draw,
            "recordsTotal": total_records,
            "recordsFiltered": filtered_count,
            "data": page_data,
        }


# =============================================================================
#  Business logic (CRUD)
# =============================================================================
class CourseService:
    @staticmethod
    def create_from_post(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            name = (data.get("name") or "").strip()
            code = (data.get("code") or "").strip()
            fac_id = data.get("facilitator")

            if len(name) < 3 or len(code) < 3:
                return {"success": False, "sms": "Name and code must be at least 3 characters."}

            if Course.objects.filter(code__iexact=code).exists():
                return {"success": False, "sms": "Course code already exists."}

            Course.objects.create(
                name=name, code=code,
                facilitator=Facilitator.objects.get(id=fac_id) if fac_id else None,
            )
            Activity.objects.create(
                categ="course",
                title="New course added",
                maelezo="New course has been registered successfully"
                )
            return {"success": True, "sms": "Course created successfully."}
        except Exception as e:
            logger.exception("Course creation failed")
            return {"success": False, "sms": "Failed to create course."}

    @staticmethod
    def update_from_post(course_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            course = Course.objects.get(id=course_id)
            code = (data.get("code") or "").strip()

            if Course.objects.filter(code__iexact=code).exclude(id=course_id).exists():
                return {"success": False, "sms": "Course code already exists."}

            course.name = (data.get("name") or "").strip()
            course.code = code
            fac_id = data.get("facilitator")
            course.facilitator = Facilitator.objects.get(id=fac_id) if fac_id else None
            course.save()

            Activity.objects.create(
                categ="course",
                title="Course updated",
                maelezo="Course information has been updated"
                )

            return {"success": True, "sms": "Course updated successfully."}
        except Course.DoesNotExist:
            return {"success": False, "sms": "Course not found."}
        except Exception as e:
            logger.exception("Course update failed")
            return {"success": False, "sms": "Update failed."}

    @staticmethod
    def delete_by_id(course_id: int) -> Dict[str, Any]:
        try:
            Course.objects.filter(id=course_id).delete()
            Activity.objects.create(
                categ="course",
                title="Course deleted",
                maelezo="One course has been removed from system"
                )
            return {"success": True, "sms": "Course deleted successfully."}
        except Exception as e:
            logger.exception("Course delete failed")
            return {"success": False, "sms": "Delete failed."}

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
                    code = str(row[1] or '').strip() if len(row) > 1 else ''
                    facil = str(row[2]).strip() if len(row) > 2 and row[2] else None
                    
                    if facil:
                        facil = Facilitator.objects.filter(name__iexact=facil).first()

                    if len(name) < 3 or len(code) < 3:
                        failed.append({'row': row_num, 'reason': 'Name or Code is too short.'})
                        continue
                    elif Course.objects.filter(code__iexact=code).exists():
                        failed.append({'row': row_num, 'reason': 'Code already exists.'})
                        continue

                    Course.objects.create(name=name, code=code, facilitator=facil)
                    created_count += 1

            wb.close()

            sms = f'Imported {created_count} course(s) successfully.'
            if failed:
                sms += '<br>'
                sms += 'Failed courses:<br>' + '<br>'.join([
                    f'Row {f["row"]}: {f["reason"]}'
                    for f in failed
                ])

            success = created_count > 0 and len(failed) == 0
            
            if created_count > 0:
                Activity.objects.create(
                    categ="course",
                    title="Multiple courses added",
                    maelezo=f"{created_count} courses has been registered from excel sheet"
                    )

            return {'success': success, 'sms': sms}

        except Exception as e:
            logger.exception("Facilitators import failed")
            return {'success': False, 'sms': f'Error processing file: {str(e)}'}
        
    @staticmethod
    def delete_multiple(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            courses = data.get("courses_list", "")
            courses_list = [int(x) for x in courses.split(",") if x.strip()]
            delete_type = data.get("delete_type")
            
            if delete_type == "all":
                get_all = Course.objects.all()
                if len(get_all) == 0:
                    return {"success": False, "sms": "No students available to delete."}
                
                get_all.delete()
                Activity.objects.create(
                    categ="course", title="All courses deleted",
                    maelezo="All courses have been erased from system"
                    )
                return {"success": True, "sms": "All courses deleted successfully."}
            
            for course in courses_list:
                Course.objects.filter(id=course).delete()
            Activity.objects.create(
                categ="course", title="Multiple courses deleted",
                maelezo=f"{len(courses_list)} courses have been deleted from system"
                )
            return {"success": True, "sms": f"{len(courses_list)} courses deleted successfully."}
                
        except Exception as e:
            logger.exception("Course delete failed")
            return {"success": False, "sms": "Operation failed."}
    
    @staticmethod
    def transfer_facilitator(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            facil_start = data.get("facil_change_start")
            facil_end = data.get("facil_change_end")

            # Validate that both values are provided
            if facil_start is None or facil_end is None or facil_start == "" or facil_end == "":
                return {"success": False, "sms": "Both facilitator must be selected"}
            
            # Convert to integers and validate
            try:
                facil_start_id  = int(facil_start)
                facil_end_id  = int(facil_end)
            except (ValueError, TypeError):
                return {"success": False, "sms": "Invalid facilitator values"}
            
            # Check if they're the same
            if facil_start_id == facil_end_id:
                return {"success": False, "sms": "Please select different facilitator"}
            
            # Handle start facilitator (0 means null/no facilitator)
            if facil_start_id == 0:
                startFacil = None
                coursesList = Course.objects.filter(facilitator__isnull=True)
            else:
                startFacil = Facilitator.objects.filter(id=facil_start_id).first()
                if not startFacil:
                    return {"success": False, "sms": "Start facilitator not found"}
                coursesList = Course.objects.filter(facilitator=startFacil)

            # Handle end facilitator (0 means null/no facilitator)
            if facil_end_id == 0:
                endFacil = None
            else:
                endFacil = Facilitator.objects.filter(id=facil_end_id).first()
                if not endFacil:
                    return {"success": False, "sms": "End facilitator not found"}

            # transfer courses
            courses_updated = coursesList.update(facilitator=endFacil)

            Activity.objects.create(
                categ="course", title="Multiple courses transfered",
                maelezo=f"{courses_updated} courses have been transfered to new facilitator"
                )
            return {"success": True, "sms": f"{courses_updated} courses transfered successfully."}
                
        except Exception as e:
            logger.exception("Course transfer failed")
            return {"success": False, "sms": "Operation failed."}

# =============================================================================
#  Views
# =============================================================================
@never_cache
@login_required
def courses_page(request: HttpRequest) -> HttpResponse:
    if request.method == "POST" and request.headers.get("X-Requested-With") == "XMLHttpRequest":
        base_qs = Course.objects.select_related("facilitator").all()

        column_filter_fields = {
            1: "name",
            2: "code",
            3: "facilitator__id",
        }

        column_sort_fields = {
            1: "name",
            2: "code",
            3: "facilitator__name",
        }

        column_filter_types = {
            "facilitator__id": "exact",
        }

        result = DataTableProcessor.process_request(
            request=request,
            queryset=base_qs,
            global_search_fields=["name", "code", "facilitator__name"],
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
                "code": obj.code,
                "facilitator": obj.facilitator.name if obj.facilitator else "n/a",
                "facilitator_id": obj.facilitator.id if obj.facilitator else "",
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

    return render(
        request,
        "courses/courses.html",
        {"facilitators": Facilitator.objects.all().order_by("name")},
    )


@never_cache
@login_required
def courses_actions(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"success": False, "sms": "Invalid request"}, status=405)
    
    if 'excel_file' in request.FILES:
        uploaded_file = request.FILES['excel_file']
        now = datetime.now().strftime("%Y-%m-%d_%H%M%S")
        original_ext = os.path.splitext(uploaded_file.name)[1].lower()
        new_filename = f"{now}_courses{original_ext}"
        fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, 'tmp'))
        
        # Save with new name
        filepath = fs.path(fs.save(new_filename, uploaded_file))
        
        try:
            result = CourseService.import_from_excel(filepath)
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
    course_id = post_data.get("course_id")
    delete_id = post_data.get("delete_id")
    delete_type = post_data.get("delete_type")
    facil_transfer = post_data.get("facil_change_start")

    if delete_id:
        return JsonResponse(CourseService.delete_by_id(delete_id))
    if course_id:
        return JsonResponse(CourseService.update_from_post(int(course_id), post_data))
    if delete_type:
        return JsonResponse(CourseService.delete_multiple(post_data))
    if facil_transfer:
        return JsonResponse(CourseService.transfer_facilitator(post_data))
    return JsonResponse(CourseService.create_from_post(post_data))
