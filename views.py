from django.shortcuts import render
import json
from django.http import HttpResponse, JsonResponse
import subprocess as subp
import os
import requests
import time
import random
import sys
import re
from urllib.parse import urlparse
from django.views.decorators.csrf import csrf_exempt

# import __virus_detect_alg_

# Create your views here.


@csrf_exempt
def protect(request):
    response = HttpResponse()
    if request.method != "POST":
        response.status_code = 405
        return response
    # print(request.POST)
    file_path = request.POST.get("file_path", "")
    file_id = request.POST.get("uniquified_id", "")
    site_cookie = request.POST.get("cookies", "")
    host_site = request.POST.get("siteHost", "")

    print(host_site)

    file_cookies = {}
    if site_cookie:
        try:
            cookie_dict = json.loads(site_cookie)
            print("This is", cookie_dict)
            if len(cookie_dict) > 0:
                file_cookies = cookie_dict
        except:
            pass
    uniq_id_dict = {}

    if file_id:
        uniq_id_dict = {
            "uniquified_id": file_id
        }

    file_parse = urlparse(file_path)
    print("File Parse", file_path)
    if not file_path or not file_parse[0] or not file_parse[1]:
        print("Not finding...")
        response = HttpResponse()
        response.status_code = 404
        return response
    peepath = os.path.join(os.getcwd(), "__virus_detect_alg_/app.py")
    # peearg = "-j"
    peevalue = "sample.pdf"
    url = file_path
    temp_pdf_dir = os.path.join(os.getcwd(), "__virus_detect_alg_/temp_pdf_files/")

    # the file cookies
    print("# the file cookies", file_cookies)
    # Download external file
    try:
        temp_file = requests.get(url, stream=True,
                                 cookies=file_cookies)

        request_contents = temp_file.content
    except:
        content = {
            "error": True,
            "reason": "PDF file not found!"
        }
        response = JsonResponse(content)
        response.status_code = 400
        return response

    if temp_file.status_code != 200:
        content = {
            "error": True,
            "reason": "PDF file not found!"
        }
        response = JsonResponse(content)
        response.status_code = 404
        return response

    # print(request_contents)

    # save file temporarily =
    def current_milli_time(): return int(round(time.time() * 1000))
    temp_file_name = os.path.join(
        os.getcwd(), "__virus_detect_alg_/temp_pdf_files/pdf_file"+str(current_milli_time())+".pdf")
    # temp_file_name = os.path.join(
    #     os.getcwd(), "__virus_detect_alg_/temp_pdf_files/pdf_file1000.pdf")

    with open(temp_file_name, "wb") as tempo_file:
        for chunk in temp_file.iter_content(len(temp_file.content)):
            tempo_file.write(chunk)

    print(temp_file_name)
    process = subp.Popen([peepath, "-j", "-f", temp_file_name], stdout=subp.PIPE)
    process.wait()
    peeoutput = process.communicate()[0]
    # print(peepath, "-j", "-f", temp_file_name)
    # print(peeoutput)

    os.unlink(temp_file_name)

    if peeoutput is None:
        response.status_code = 500
        return response
    try:
        success_dict = {
            "success": True
        }
        success_dict.update(json.loads(peeoutput))
        success_dict.update(uniq_id_dict)
        context = success_dict
        return JsonResponse(context)
    except:
        print("here")
        context = {
            "error": True,
            "reason": "error reading PDF file!"
        }
        response = JsonResponse(context)
        response.status_code = 400
        return response
