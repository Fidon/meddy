from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.dash_page, name='dashboard_page'),
]