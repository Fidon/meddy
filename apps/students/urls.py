from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.students_page, name='students_page'),
    path('actions/', v.students_actions, name="students_actions"),
]
