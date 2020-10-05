from flask import escape
import requests
from functools import reduce

from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import pandas as pd

import re

def hello_http(request):
    request_json = request.get_json(silent=True)
    request_args = request.args
    email = None
    password = None

    if(request_args):
        email = request_args['email']
        password = request_args['password']
        teacherId = request_args['teacherId']
        date = request_args['date']
        hour = request_args['hour']
        minutes = request_args['minutes']
        
        # (driver.current_url)

    selenium_driver = initialize_driver()
    # japatalk_login(selenium_driver, 'jopetor2@gmail.com', '1q2w3e4r')

    reservation_confirm_function = ''.join([
        '<script>',
            'function moveWithReserveInfoDay(script, date, hour, minutes, teacherId) {', 
                'window.location.replace(window.location.href', 
                '?date=date&hour=hour&minutes=minutes&teacherId=teacherId)',
            '}', 
        '</script>'])
        
# javascript:moveWithReserveInfoDay('reservation_confirm.php', '2020-10-16', 9, 0, 1202);
    # availables = 
    header = '<html><head>'+reservation_confirm_function+'<link href="css/souppot.css" rel="stylesheet"><link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet"/><link href="https://www.japatalk.com/css/souppot.css" rel="stylesheet"><link href="https://www.japatalk.com/css/style.css" rel="stylesheet"><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script><link rel="stylesheet" type="text/css" href="https://www.japatalk.com/js/slick/slick.css"><link rel="stylesheet" type="text/css" href="https://www.japatalk.com/js/slick/slick-theme.css"><link rel="stylesheet" type="text/css" href="https://www.japatalk.com/js/bxslider/jquery.bxslider.css"></head><body><div id="main"><div class="container schedule">'

    table = get_teacher_page(selenium_driver, email, password)
    # [print(available) for available in availables]

    # html = '<html><link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css" rel="stylesheet"/><script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script>'
    # html+= '<div class="container"><table class="cal-table"><thead><tr><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Book</th></tr></thead><body>'
    # map(availables, lambda available: print(available['function']))
    # rows = map(build_row, availables)
    # html+= reduce(lambda node1, node2: str(str(node1['function'])+ str(node2['function'])), availables)
    # html+= ''.join(rows)
    # html+= '</tbody></table></div></html>'

    # selenium_driver.execute_script(availables[0]['function'])
    # selenium_driver.execute_script("javascript:void(0);")
    html = header + table + '</div></div></body></html>'

    print(html)
    return html

def initialize_driver():
    options = Options()
    options.binary_location = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
    driver_path = '/Users/jm_perez/Desktop/chromedriver'
    driver = webdriver.Chrome(options = options, executable_path = driver_path)

    return driver

def japatalk_login(driver, mail, password):
    print('#### LOGGING ####')
    driver.get('https://www.japatalk.com/login_form.php')

    emailInput = driver.find_element_by_id('wID')
    passwordInput = driver.find_element_by_id('wPasswd')
    submitButton = driver.find_element_by_class_name('btn-blue')
    emailInput.send_keys(mail)
    passwordInput.send_keys(password)
    submitButton.click()

    # wait = WebDriverWait( driver, 5 )

def get_teacher_page(driver, mail, password):
    if(mail and password):
        japatalk_login(driver, mail, password)

    driver.get('https://www.japatalk.com/staff_detail_00001202.php')

    content = driver.page_source
    soup = BeautifulSoup(content, 'html5lib')
    element = str(soup.find('table', { 'class': 'cal-table' }))
    return element