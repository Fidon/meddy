from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.facilitators_page, name='facilitators_page'),
    path('actions/', v.facilitators_actions, name="facilitators_actions"),
]
