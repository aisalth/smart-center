<?php

namespace App\Http\Controllers;

use App\Services\SsoApiService;

class AnalyticsController extends Controller
{
    public function __construct(protected SsoApiService $ssoApi) {}

    public function index()
    {
        return response()->json([
            'status' => 'success',
            'data' => $this->ssoApi->getUserAnalytics()
        ]);
    }
}