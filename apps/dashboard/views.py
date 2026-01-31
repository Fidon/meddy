from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse

from .models import Activity
from apps.students.models import Student
from apps.courses.models import Course
from apps.facilitators.models import Facilitator
from apps.programs.models import Program


@never_cache
@login_required
def dash_page(request: HttpRequest) -> HttpResponse:
    CATEGORY_STYLES = {
        "student": ("blue", "fas fa-user-graduate"),
        "course": ("yellow", "fas fa-book-open"),
        "facilitator": ("green", "fas fa-chalkboard-user"),
        "program": ("black", "fas fa-graduation-cap"),
    }
    
    recent_actions = Activity.objects.select_related().order_by("-created_at")[:5]
    sorted_data = [
        {
            "color": CATEGORY_STYLES.get(item.categ, ("blue", "fas fa-user-graduate"))[0],
            "icon": CATEGORY_STYLES.get(item.categ, ("blue", "fas fa-user-graduate"))[1],
            "title": item.title,
            "info": item.maelezo,
            "time": item.created_at,
        }
        for item in recent_actions
    ]
    
    context = {
        "recentActions": sorted_data,
        "students": f"{Student.objects.count():,.0f}",
        "courses": f"{Course.objects.count():,.0f}",
        "programs": f"{Program.objects.count():,.0f}",
        "facilitators": f"{Facilitator.objects.count():,.0f}",
    }
    
    return render(request, "dashboard/home.html", context)