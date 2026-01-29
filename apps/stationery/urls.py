from django.urls import path
from . import views as v

urlpatterns = [
    path('', v.cover_page, name='cover_page'),
    path('actions/', v.cover_page_actions, name='cover_actions'),
]
