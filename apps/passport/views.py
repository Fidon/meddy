from django.shortcuts import render
from django.views.decorators.cache import never_cache
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse, HttpRequest, HttpResponse

@never_cache
@login_required
def passport_page(request: HttpRequest) -> HttpResponse:
    return render(request, 'passport/passport.html')

