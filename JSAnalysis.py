# App ::Init

'''
    This module contains some functions to analyse Javascript code inside the PDF file
'''

import jsbeautifier
import os
import re
import sys
import traceback

from PDFUtils import unescapeHTMLEntities, escapeString

try:
    import PyV8

    JS_MODULE = True

    class Global(PyV8.JSClass):
        reCode = ''

        def evalOverride(self, expression):
            self.reCode += '\n\n// Details of the evaluated code\n' + expression
            return

except:
    JS_MODULE = False


errorsFile = 'errors.txt'
# Gets the line separator of the current operating system, Eg: (Windows: \, Linux: /)
newLine = os.linesep

# This is a regular expression definition that match a script element in the PDF JS Object
reJSscript = '<script[^>]*?contentType\s*?=\s*?[\'"]application/x-javascript[\'"][^>]*?>(.*?)</script>'

#This is the general App class of an Adobe PDF JavaScript implementation
preDefinedCode = 'var app = this;'


def analyseJS(code, context=None, manualAnalysis=False):
    errors = []
    jsCode = []
    unESbs = []
    urlsFound = []

    try:
        code = unescapeHTMLEntities(code)
        scriptElements = re.findall(
            reJSscript, code, re.DOTALL | re.IGNORECASE)
        if scriptElements:
            code = ''
            for scriptElement in scriptElements:
                code = code + scriptElement + '\n\n'
        code = jsbeautifier.beautify(code)
        jsCode.append(code)
        
        # Check if the code argument is supplies, and the PYV8 module is present on our computer
        if code is not None and JS_MODULE and not manualAnalysis:
            if context is None:
                context = PyV8.JSContext(Global())
            context.enter()
            # Hooking the eval function
            context.eval('eval=evalOverride')
            # context.eval(preDefinedCode)
            while True:
                originalCode = code
                try:
                    context.eval(code)
                    reCode = context.eval('reCode')
                    reCode = jsbeautifier.beautify(reCode)
                    if reCode != '' and reCode != code:
                        code = reCode
                        jsCode.append(code)
                    else:
                        break
                except:
                    error = str(sys.exc_info()[1])
                    open('jserror.log', 'ab').write(error + newLine)
                    errors.append(error)
                    break

            if code != '':
                # This searches for variables that are been escaped, so that we can trate them
                # and turn them into unescape
                escapedVars = re.findall(
                    '([-a-zA-Z0-9]*?)\s*?=\s*?(unescape\((.*?)\))', code, re.DOTALL)
                for var in escapedVars:
                    bytes = var[2]
                    if bytes.find('+') != -1 or bytes.find('%') == -1:
                        varContent = getVarContent(code, bytes)
                        if len(varContent) > 150:
                            ret = unescape(varContent)
                            if ret[0] != -1:
                                bytes = ret[1]
                                urls = re.findall(
                                    'https?://.*$', bytes, re.DOTALL)
                                if bytes not in unESbs:
                                    unESbs.append(bytes)
                                for url in urls:
                                    if url not in urlsFound:
                                        urlsFound.append(url)
                    else:
                        bytes = bytes[1:-1]
                        if len(bytes) > 150:
                            ret = unescape(bytes)
                            if ret[0] != -1:
                                bytes = ret[1]
                                urls = re.findall(
                                    'https?://.*$', bytes, re.DOTALL)
                                if bytes not in unESbs:
                                    unESbs.append(bytes)
                                for url in urls:
                                    if url not in urlsFound:
                                        urlsFound.append(url)
    except:
        traceback.print_exc(file=open(errorsFile, 'a'))
        errors.append('Unexpected error in the JSAnalysis module!!')
    finally:
        for js in jsCode:
            if js is None or js == '':
                jsCode.remove(js)
    return [jsCode, unESbs, urlsFound, errors, context]


def getVarContent(jsCode, varContent):
    clearBytes = ''
   
    replicas = ['\n', '\r', '\t', ' ']

    for v in replicas:
        varContent = varContent.replace(v, '')

    parts = varContent.split('+')
    for part in parts:
        if re.match('["\'].*?["\']', part, re.DOTALL):
            clearBytes += part[1:-1]
        else:
            part = escapeString(part)
            varContent = re.findall(
                part + '\s*?=\s*?(.*?)[,;]', jsCode, re.DOTALL)
            if varContent:
                clearBytes += getVarContent(jsCode, varContent[0])
    return clearBytes


def isJavascript(content):
    V=any
    I=True
    q=False
    r=['var\W+=.+','let\W+=.+','const\W+=.+']
    v=['for\W*\(.+?\)\W*','while\W*\(.+?\)\W*','do\W*\{?.+?\}?\W*while\W*\(.+?\)\W*','if\W*\(.+?\)\W*\W*\{?.+?\}?\W*','else\W*\{?.+?\}?\W*','while\W*\(.+?\)\W*','break\:\W*','function\((.*?)\)\W*?;','\(.+?\)\W*=>\W*','`.+?`','import\W*(\'|").+?(\'|")\W*']
    if V(re.match(peps,content)for peps in r):
        return I
    else:
        return q


def searchObfuscatedFunctions(jsCode, function):
  y = None
  D = True
  e = False
  z = []
  if jsCode != y:
    f = re.findall('\W*('+function+'\W*?\((.*?)\)\W*?;)',
                    jsCode, re.DOTALL)
    if f:
      for c in f:
        if re.findall('return', c[1], re.IGNORECASE):
          z.append([function, c, D])
        else:
          z.append([function, c, e])
    H = re.findall('\s*?(([-a-zA-Z0-9]*?)\s*?=\s*?' +
                    function+')\s*?;', jsCode, re.DOTALL)
    for F in H:
      M = F[1]
      z = z+searchObfuscatedFunctions(jsCode, M)
  return z


def unescape(ESbs,l=True):
  x=True
  l=unicode
  j=range
  Q=len
  H=chr
  U=int
  y=''
  if l:
    q='\x00'
  else:
    q=''
  try:
    if ESbs.lower().find('%u')!=-1 or ESbs.lower().find('\u')!=-1 or ESbs.find('%')!=-1:
      if ESbs.lower().find('\u')!=-1:
        S=ESbs.split('\\')
      else:
        S=ESbs.split('%')
      for i in j(Q(S)):
        u=S[i]
        if u=='':
          continue
        if Q(u)>4 and re.match('u[0-9a-f]{4}',u[:5],re.IGNORECASE):
          y+=H(U(u[3]+u[4],16))+H(U(u[1]+u[2],16))
        if Q(u)>5:
          for j in j(5,Q(u)):
            y+=u[j]+q
        elif Q(u)>1 and re.match('[0-9a-f]{2}',u[:2],re.IGNORECASE):
          y+=H(U(u[0]+u[1],16))+q
          if Q(u)>2:
            for j in j(2,Q(u)):
              y+=u[j]+q
        else:
          if i!=0:
            y+='%'+q
        for j in j(Q(u)):
          y+=u[j]+q
    else:
      y=ESbs
  except:
    return(-1,'Error while unescaping the bytes')
  return(0,y)
