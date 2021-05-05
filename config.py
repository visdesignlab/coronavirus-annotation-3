#!/usr/bin/env python3
# -*- encoding: utf-8 -*-
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

DEBUG = False

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'app.db')
#this makes sure an error message doesnt happen when you start the app
SQLALCHEMY_TRACK_MODIFICATIONS = False

DATABASE_CONNECT_OPTIONS = {}

SECRET_KEY = 'SuperSecret'

THREADS_PER_PAGE = 8

##THIS WOULD HAVE 