from flask import escape
import requests
from functools import reduce
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import pandas as pd
import re
from IPython.core.display import display, HTML

def hello_http(request):
    #request_json = request.get_json(silent=True)
    request_args = request.args
    print(request_args)
    print(request.get_json(silent=True))
    
    #request_args = None
    #if(request and request['args']):
    #    request_args = request['args']

    email = None
    password = None
    date = None
    hour = None
    minutes = None

    if(request_args):
        email = request_args['email']
        password = request_args['password']
        teacherId = request_args['teacherId']
        date = request_args['date']
        hour = request_args['hour']
        minutes = request_args['minutes']
    
    selenium_driver = initialize_driver()
    
    if(email and password):
        japatalk_login(selenium_driver, email, password)
    
    if(date is not None and hour is not None and minutes is not None and teacherId is not None):
        book_class(selenium_driver, date, hour, minutes, teacherId, email, password)
    
    script = '<script type="text/javascript">function moveWithReserveInfoDay(script, date, hour, minutes, teacherId) { window.location.replace(window.location.href + "?date="+date+"&hour="+hour+"&minutes="+minutes+"&teacherId="+teacherId+"&email="+document.getElementById("email").value+"&password="+document.getElementById("pass").value&teacherId="+document.getElementById("teacherId").value)}</script>'
    header = '<html><head><link href="css/souppot.css" rel="stylesheet"><link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet"/><link href="https://www.japatalk.com/css/souppot.css" rel="stylesheet"><link href="https://www.japatalk.com/css/style.css" rel="stylesheet"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script><link rel="stylesheet" type="text/css" href="https://www.japatalk.com/js/slick/slick.css"><link rel="stylesheet" type="text/css" href="https://www.japatalk.com/js/slick/slick-theme.css"><link rel="stylesheet" type="text/css" href="https://www.japatalk.com/js/bxslider/jquery.bxslider.css"></script></head><body><div id="main"><div class="container schedule">'+script
    table = get_teacher_page(selenium_driver, email, password, teacherId)
    select = "<label>Email:</label><input type='text' id='email' /><label>Password:</label><input type='password' id='pass' /><label>TeacherId:</label><input type='number' id='teacherId' />";
    html = header + select + table + '</div></div></body></html>'
    html = html.replace('javascript:moveWithReserveInfoDay(', 'moveWithReserveInfoDay(')
    
    selenium_driver.quit();
    
    display(HTML(html))

def initialize_driver():
    options = Options()
    options.binary_location = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    driver_path = '/Users/jm_perez/Desktop/chromedriver'
    driver = webdriver.Chrome(options = options, executable_path = driver_path)

    return driver

def japatalk_login(driver, mail, password):
    driver.get('https://www.japatalk.com/login_form.php')

    emailInput = driver.find_element_by_id('wID')
    passwordInput = driver.find_element_by_id('wPasswd')
    submitButton = driver.find_element_by_class_name('btn-blue')
    emailInput.send_keys(mail)
    passwordInput.send_keys(password)
    submitButton.click()

    #wait = WebDriverWait( driver, 5 )
    
def book_class(driver, date = '', hour = -1, minutes = -1, teacherId = 1202):
    driver.get('https://www.japatalk.com/staff_detail_0000'+str(teacherId)+'.php')
    onclick_key = "javascript:moveWithReserveInfoDay('reservation_confirm.php', '"+date+"', "+str(hour)+", "+str(minutes)+", "+str(teacherId)+");";
    driver.execute_script(onclick_key)
    
    wait = WebDriverWait( driver, 1 )
    driver.execute_script("javascript:void(0);")
    
def get_teacher_page(driver, mail, password, teacherId):
    driver.get('https://www.japatalk.com/staff_detail_0000'+str(teacherId)+'.php')

    content = driver.page_source
    soup = BeautifulSoup(content, 'html5lib')
    element = str(soup.find('table', { 'class': 'cal-table' }))
    return element
