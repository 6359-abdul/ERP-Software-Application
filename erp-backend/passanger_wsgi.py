import sys
import os

# 1. Add the current directory to sys.path so Python can find 'app.py' and 'wsgi.py'
#    'os.path.dirname(__file__)' is the folder containing this script (erp-backend)
sys.path.insert(0, os.path.dirname(__file__))

# 2. Import the 'application' object from 'wsgi.py'
#    cPanel looks for a variable named 'application' by default in this file.
from wsgi import application
