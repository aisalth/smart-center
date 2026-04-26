<?php

return [
    'api_base_url' => env('MONITORING_API_BASE_URL', 'http://ipguehnanti:3000/monitoring'),
    'device_ip'    => env('MONITORING_DEVICE_IP', 'ipguehnanti'),
    'poll_interval_minutes' => 1,
];