from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.cache import never_cache
from django.http import FileResponse, Http404
from django.conf import settings
import os


@never_cache
def index_page(request):
    if request.user.is_authenticated:
        response = redirect(reverse('dashboard_page'))
        response.set_cookie('username', request.user.username)
        return response
    return render(request, 'index.html')


@never_cache
def download_file(request, filename):
    base_dir = os.path.join(settings.BASE_DIR, 'docs')
    file_path = os.path.join(base_dir, filename)

    if not os.path.isfile(file_path):
        raise Http404("File not found")

    if '..' in filename or filename.startswith(('/', '\\')):
        raise Http404("Invalid filename")

    response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
    return response

def error_404(request, exception):
    return render(request, '404.html', status=404)

