from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.programs_page, name='programs_page'),
    path('actions/', v.programs_actions, name="programs_actions"),
]
