<?php
return [
    'timeout' => env('SNMP_TIMEOUT', 1000000),
    'retries' => env('SNMP_RETRIES', 2),
    'max_oids' => env('SNMP_MAX_OIDS', 10),
];