from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.passport_page, name='passport_page'),
]