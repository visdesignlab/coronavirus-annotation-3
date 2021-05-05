# !/usr/bin/env python3
# -*- encoding: utf-8 -*-
from flask import (
    Blueprint,
    render_template,
    request,
)


mod = Blueprint('dashboard', __name__, url_prefix='/dashboard')


@mod.route('/')
# @login_required
def index():
    print("messss", request.args.get('user'))
    return render_template(
        'dashboard/index.html',
        keys=request.args.get('user')
        )
