<?php

return [
    // ── Legacy single-target (backward compat) ──
    'api_base_url' => env('MONITORING_API_BASE_URL', 'http://localhost:3000/monitoring'),
    'device_ip'    => env('MONITORING_DEVICE_IP', 'localhost'),
    'poll_interval_minutes' => 1,

    // ── Multi-target support ──
    'targets' => [
        'ibra' => [
            'api_base_url' => env('MONITORING_API_BASE_URL', ''),
            'device_ip'    => env('MONITORING_DEVICE_IP', ''),
            'category'     => env('MONITORING_DEVICE_CATEGORY', 'snmp'),
        ],
        'alzaki' => [
            'api_base_url' => env('MONITORING_ALZAKI_API_BASE_URL', ''),
            'device_ip'    => env('MONITORING_ALZAKI_DEVICE_IP', ''),
            'category'     => 'docker',
        ],
    ],
];