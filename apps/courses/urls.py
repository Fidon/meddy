from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.courses_page, name='courses_page'),
    path('actions/', v.courses_actions, name="courses_actions"),
]
