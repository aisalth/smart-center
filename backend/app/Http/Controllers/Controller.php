<?php

namespace App\Http\Controllers;

abstract class Controller
{
    public function __construct()
{
    date_default_timezone_set('Asia/Jakarta');
}
}
