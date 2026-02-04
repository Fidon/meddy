from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpRequest, HttpResponse
from typing import Dict, Any
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.db.models import Q
import logging

from apps.programs.models import Program
from apps.courses.models import Course
from apps.students.models import Student
from apps.dashboard.models import Activity
from .models import Question, Page

from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


# =============================================================================
# CRUD Service
# =============================================================================

class CrudServices:
    @staticmethod
    def save_question(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            question = (data.get("question") or "").strip()

            if len(question) < 5:
                return {"success": False, "sms": "Question is too short."}

            if Question.objects.filter(content__iexact=question).exists():
                return {"success": True, "sms": "Question saved successfully!"}

            Question.objects.create(content=question)

            Activity.objects.create(
                categ="student",
                title="New question saved",
                maelezo="One question has been added to the system"
                )
            
            return {"success": True, "sms": "Question saved successfully!"}
        except Exception as e:
            logger.exception("Failed to save")
            return {"success": False, "sms": "Operation failed."}
        
    @staticmethod
    def save_cover_page(data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = data.get("task") or ""
            groupno = 0 if data.get("grpno") == "" else data.get("grpno")
            subdate = None if data.get("subdate") in ("", "N/A") else data.get("subdate")
            streams = data.get("streams")  or ""
            streams = streams.split(',') if streams else []
            students = data.get("students") or ""
            students = students.split(',') if students else []
            prog = None if data.get("prog") in ("", "N/A") else data.get("prog")
            course = None if data.get("course") in ("", "N/A") else data.get("course")
            quen = None if data.get("question") == "" else data.get("question")
            table = data.get('table') == 'true'

            if prog:
                prog = Program.objects.filter(abbrev__iexact=prog).first()
            
            if course:
                course = Course.objects.filter(code__iexact=course).first()

            if task == "" or len(task) < 3:
                return {"success": False, "sms": "Task name is too short"}

            Page.objects.create(
                task=task, groupno=groupno, submitdate=subdate,
                streams=streams, students=students, program=prog,
                course=course, question=quen, table=table
            )

            Activity.objects.create(
                categ="student",
                title="New page saved",
                maelezo="One page has been added to the system"
                )
            
            return {"success": True, "sms": "Page saved successfully!"}
        except Exception as e:
            logger.exception("Failed to save")
            return {"success": False, "sms": "Failed to save this page."}
        
    @staticmethod
    def load_saved_page_info(page: int) -> Dict[str, any]:
        try:
            pg = Page.objects.get(id=page)
            prog = pg.program.name if pg.program else 'N/A'
            progId = pg.program.id if pg.program else 0
            course = pg.course.name if pg.course else 'N/A'
            courseId = pg.course.id if pg.course else 0
            code = pg.course.code if pg.course else 'N/A'
            c_class = pg.program.abbrev if pg.program else 'N/A'
            facil = pg.course.facilitator if pg.course else 'N/A'
            facil = 'N/A' if facil == 'N/A' else facil.name
            subdate = pg.submitdate if pg.submitdate else None
            stds = [int(x) for x in pg.students]
            streamsList = [str(x) for x in pg.streams]
            studentList = list(Student.objects.filter(id__in=stds).values("id", "fullname", "regnumber"))

            return_data = {
                "success": True, "prog": prog, "course": course, "code": code,
                "class": c_class, "facil": facil, "task": pg.task, "grpno": pg.groupno,
                "subdate": subdate, "students": studentList, "qn": pg.question or "",
                "sms": "Page loaded successfully!", "streams": streamsList, "table": pg.table,
                "progId": progId, "courseId": courseId,
            }
            return return_data
        except Exception as e:
            logger.exception("Question delete failed")
            return {"success": False, "sms": "Operation failed."}

    @staticmethod
    def delete_question(question_id: int) -> Dict[str, Any]:
        try:
            Question.objects.get(id=question_id).delete()
            return {"success": True, "sms": "Question deleted successfully!"}
        except Exception as e:
            logger.exception("Failed to delete question")
            return {"success": False, "sms": "Failed to delete question."}
    
    @staticmethod
    def delete_page(page_id: int) -> Dict[str, Any]:
        try:
            Page.objects.get(id=page_id).delete()
            return {"success": True, "sms": "Page deleted successfully!"}
        except Exception as e:
            logger.exception("Failed to delete page")
            return {"success": False, "sms": "Failed to delete page."}
    
    @staticmethod
    def paginate_queryset(queryset, page_number, per_page):
        """Helper function to paginate any queryset"""
        paginator = Paginator(queryset, per_page)
    
        try:
            page_obj = paginator.page(page_number)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)
        
        return {
            'items': page_obj,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'start_index': page_obj.start_index() if paginator.count > 0 else 0,
                'end_index': page_obj.end_index() if paginator.count > 0 else 0,
            }
        }
    
    @staticmethod
    def handle_pagination(request):
        """Handle AJAX pagination requests for all sections"""
        section_type = request.POST.get('section_type')
        page_number = request.POST.get('page', 1)
        search_query = request.POST.get('search', '').strip()
        per_page = int(request.POST.get('per_page', 10))
        
        # Map section types to models and search fields
        section_config = {
            'students': {
                'model': Student,
                'order_by': 'fullname',
                'search_fields': ['fullname', 'regnumber'],
                'serializer': lambda obj: {
                    'id': obj.id,
                    'fullname': obj.fullname,
                    'regnumber': obj.regnumber
                }
            },
            'programs': {
                'model': Program,
                'order_by': 'name',
                'search_fields': ['name', 'abbrev'],
                'serializer': lambda obj: {
                    'id': obj.id,
                    'name': obj.name,
                    'abbrev': obj.abbrev
                }
            },
            'courses': {
                'model': Course,
                'order_by': 'name',
                'search_fields': ['name', 'code', 'facilitator__name'],
                'serializer': lambda obj: {
                    'id': obj.id,
                    'name': obj.name,
                    'code': obj.code,
                    'facilitator': obj.facilitator.name if obj.facilitator else None
                }
            },
            'questions': {
                'model': Question,
                'order_by': '-created_at',
                'search_fields': ['content'],
                'serializer': lambda obj: {
                    'id': obj.id,
                    'content': obj.content
                }
            },
            'pages': {
                'model': Page,
                'order_by': '-created_at',
                'search_fields': ['task'],
                'serializer': lambda obj: {
                    'id': obj.id,
                    'task': obj.task
                }
            }
        }
        
        if section_type not in section_config:
            return JsonResponse({'success': False, 'error': 'Invalid section type'}, status=400)
        
        config = section_config[section_type]
        
        # Get queryset
        queryset = config['model'].objects.all().order_by(config['order_by'])
        
        # Apply search filter
        if search_query:
            search_q = Q()
            for field in config['search_fields']:
                search_q |= Q(**{f'{field}__icontains': search_query})
            queryset = queryset.filter(search_q)
        
        # Paginate
        paginator = Paginator(queryset, per_page)
        
        try:
            page_obj = paginator.page(page_number)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages)
        
        # Serialize items
        items_data = [config['serializer'](item) for item in page_obj]
        
        return JsonResponse({
            'success': True,
            'items': items_data,
            'pagination': {
                'current_page': page_obj.number,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count,
                'per_page': per_page,
                'has_next': page_obj.has_next(),
                'has_previous': page_obj.has_previous(),
                'start_index': page_obj.start_index() if paginator.count > 0 else 0,
                'end_index': page_obj.end_index() if paginator.count > 0 else 0,
            }
        })
        

@never_cache
@login_required
def cover_page(request: HttpRequest) -> HttpResponse:
    # Handle AJAX pagination request
    if request.method == 'POST' and request.POST.get('action') == 'paginate':
        return CrudServices.handle_pagination(request)
    
    # Initial page load with pagination for all sections
    per_page = 10
    
    # Get paginated data for each section
    programs_data = CrudServices.paginate_queryset(Program.objects.all().order_by('name'), 1, per_page)
    courses_data = CrudServices.paginate_queryset(Course.objects.all().order_by('name'), 1, per_page)
    students_data = CrudServices.paginate_queryset(Student.objects.all().order_by('fullname'), 1, per_page)
    questions_data = CrudServices.paginate_queryset(Question.objects.all().order_by('-created_at'), 1, per_page)
    pages_data = CrudServices.paginate_queryset(Page.objects.all().order_by('-created_at'), 1, per_page)
    
    data = {
        # Pass both items and pagination info separately
        'programs': programs_data['items'],
        'programs_pagination': programs_data['pagination'],
        
        'courses': courses_data['items'],
        'courses_pagination': courses_data['pagination'],
        
        'students': students_data['items'],
        'students_pagination': students_data['pagination'],
        
        'questions': questions_data['items'],
        'questions_pagination': questions_data['pagination'],
        
        'pages': pages_data['items'],
        'pages_pagination': pages_data['pagination'],
    }

    current_dir = Path(__file__).parent
    log_file = current_dir / 'coverpage_loads.txt'
    timestamp = datetime.now().strftime('%d %b %Y - %H:%M:%S')
    with open(log_file, 'a') as f:
        f.write(f'{timestamp}\n')
    
    return render(request, 'stationery/cover.html', data)

@never_cache
@login_required
def cover_page_actions(request: HttpRequest) -> JsonResponse:
    if request.method != "POST":
        return JsonResponse({"success": False, "sms": "Invalid request"})
    
    post_data = request.POST
    qn_delete = post_data.get("question_delete")
    pg_delete = post_data.get("page_delete")
    pg_save = post_data.get("save_page")
    pg_info = post_data.get("page_info")
    
    if pg_save:
        return JsonResponse(CrudServices.save_cover_page(post_data))
    if pg_info:
        return JsonResponse(CrudServices.load_saved_page_info(pg_info))
    if pg_delete:
        return JsonResponse(CrudServices.delete_page(pg_delete))
    if qn_delete:
        return JsonResponse(CrudServices.delete_question(qn_delete))
    return JsonResponse(CrudServices.save_question(post_data))
