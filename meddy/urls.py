from django.contrib import admin
from django.urls import include, path
from . import views as v

handler404 = 'meddy.views.error_404'


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', v.index_page, name='index_page'),
    path('download/<path:filename>', v.download_file, name='download_file'),
    path('home/', include('apps.dashboard.urls')),
    path('users/', include('apps.users.urls')),
    path('programs/', include('apps.programs.urls')),
    path('facilitators/', include('apps.facilitators.urls')),
    path('courses/', include('apps.courses.urls')),
    path('students/', include('apps.students.urls')),
    path('cover-page/', include('apps.stationery.urls')),
    path('passport/', include('apps.passport.urls')),
]
