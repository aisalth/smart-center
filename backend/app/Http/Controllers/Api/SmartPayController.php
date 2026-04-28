<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class SmartPayController extends Controller
{
    // ══ SEED DATA ══
    private array $users = [
        ['id'=>'USR001','name'=>'Budi Santoso','email'=>'budi.santoso@gmail.com','phone'=>'081234567890','role'=>'member'],
        ['id'=>'USR002','name'=>'Siti Aisyah','email'=>'siti.aisyah@yahoo.com','phone'=>'085678901234','role'=>'member'],
        ['id'=>'USR003','name'=>'Rizky Maulana','email'=>'rizky.m@outlook.com','phone'=>'081122334455','role'=>'premium'],
        ['id'=>'USR004','name'=>'Dina Fitriani','email'=>'dina.fitriani@gmail.com','phone'=>'087766554433','role'=>'member'],
        ['id'=>'USR005','name'=>'Agus Tirto','email'=>'agus.tirto@gmail.com','phone'=>'089911223344','role'=>'premium'],
        ['id'=>'USR006','name'=>'Fayrin Hoshizora','email'=>'fayrin.h@mail.com','phone'=>'089988776655','role'=>'admin'],
        ['id'=>'USR007','name'=>'Ahmad Zaki','email'=>'a.zaki@proton.me','phone'=>'082133445566','role'=>'member'],
        ['id'=>'USR008','name'=>'Putri Wulandari','email'=>'putri.wulan@gmail.com','phone'=>'081299887766','role'=>'member'],
        ['id'=>'USR009','name'=>'Hendra Wijaya','email'=>'hendra.w@yahoo.com','phone'=>'081355667788','role'=>'premium'],
        ['id'=>'USR010','name'=>'Rina Marlina','email'=>'rina.marlina@gmail.com','phone'=>'085544332211','role'=>'member'],
    ];

    private array $wisataPages = [
        '/tiket','/wisata','/berita','/pengumuman','/pelayanan',
        '/events','/statistik-purbalingga','/building-categories',
        '/building-groups','/kecamatan','/cctv',
    ];

    private array $browsers = ['Chrome 124','Safari 17','Firefox 126','Edge 124','Chrome Mobile 124','Safari Mobile 17','Samsung Internet 24'];
    private array $referrers = ['Google Search','Direct','Instagram','Facebook','purbalinggakab.go.id','smartcenter.purbalingga','Google Maps','WhatsApp Share'];
    private array $devices = ['Desktop','Mobile','Tablet'];
    private array $regions = ['Purbalingga','Purwokerto','Banjarnegara','Cilacap','Kebumen','Semarang','Yogyakarta','Jakarta','Surabaya','Bandung'];

    private function randIP(): string
    {
        return rand(100,223).'.'.rand(0,255).'.'.rand(0,255).'.'.rand(1,254);
    }

    private function pick(array $arr)
    {
        return $arr[array_rand($arr)];
    }

    // ══════════════════════════════════════════════════
    // 1. SSO DASHBOARD STATS
    // ══════════════════════════════════════════════════
    public function ssoDashboard(): JsonResponse
    {
        $hour = (int) date('H');
        $loginBase = $hour * rand(50, 70);
        $regBase = $hour * rand(5, 15);

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601ZuluString(),
            'data' => [
                'login' => [
                    'today' => $loginBase + rand(100, 300),
                    'success' => $loginBase + rand(80, 250),
                    'failed' => rand(15, 60),
                    'rate' => round(rand(940, 985) / 10, 1),
                ],
                'register' => [
                    'today' => $regBase + rand(20, 80),
                    'success' => $regBase + rand(15, 70),
                    'failed' => rand(3, 18),
                    'rate' => round(rand(880, 960) / 10, 1),
                ],
                'active_sessions' => rand(350, 1200),
                'blocked_ips' => rand(2, 15),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════
    // 2. SSO WEEKLY STATS (chart data)
    // ══════════════════════════════════════════════════
    public function ssoWeekly(): JsonResponse
    {
        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $isWeekend = $date->isWeekend();
            $days[] = [
                'date' => $date->format('Y-m-d'),
                'day' => $date->locale('id')->isoFormat('ddd'),
                'login_success' => $isWeekend ? rand(80, 200) : rand(200, 500),
                'login_failed' => rand(5, 35),
                'register_success' => $isWeekend ? rand(10, 40) : rand(30, 100),
                'register_failed' => rand(2, 15),
            ];
        }

        return response()->json(['success' => true, 'data' => $days]);
    }

    // ══════════════════════════════════════════════════
    // 3. SSO LIVE AUTH FEED
    // ══════════════════════════════════════════════════
    public function ssoLiveAuth(): JsonResponse
    {
        $feed = [];
        $count = rand(5, 12);

        for ($i = 0; $i < $count; $i++) {
            $isRegister = rand(0, 100) > 65;
            $isSuccess = rand(0, 100) > 12;
            $user = $this->pick($this->users);
            $secondsAgo = $i * rand(3, 15);

            $feed[] = [
                'id' => 'AUTH' . str_pad(rand(10000, 99999), 5, '0'),
                'timestamp' => now()->subSeconds($secondsAgo)->toIso8601ZuluString(),
                'time' => now()->subSeconds($secondsAgo)->format('H:i:s'),
                'user' => $isRegister ? [
                    'name' => 'User Baru #' . rand(100, 999),
                    'email' => 'newuser' . rand(100, 999) . '@' . $this->pick(['gmail.com', 'yahoo.com', 'outlook.com']),
                    'phone' => '08' . rand(10, 99) . rand(10000000, 99999999),
                ] : $user,
                'ip' => $this->randIP(),
                'action' => $isRegister ? 'register' : 'login',
                'method' => $this->pick(['email', 'email', 'email', 'google_oauth', 'phone_otp']),
                'browser' => $this->pick($this->browsers),
                'device' => $this->pick($this->devices),
                'region' => $this->pick($this->regions),
                'status' => $isSuccess ? 'success' : 'failed',
                'failure_reason' => !$isSuccess ? $this->pick([
                    'invalid_password', 'email_not_verified', 'account_locked',
                    'rate_limited', 'captcha_failed', 'duplicate_email',
                ]) : null,
            ];
        }

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601ZuluString(),
            'data' => $feed,
        ]);
    }

    // ══════════════════════════════════════════════════
    // 4. WEBSITE TRAFFIC DASHBOARD
    // ══════════════════════════════════════════════════
    public function trafficDashboard(): JsonResponse
    {
        $hour = (int) date('H');
        $visitorBase = $hour * rand(80, 150);
        $totalReqs = $visitorBase + rand(500, 2000);
        $slowReqs = rand(5, (int)($totalReqs * 0.15));
        $errorReqs = rand(2, (int)($totalReqs * 0.05));

        return response()->json([
            'success' => true,
            'data' => [
                'visitors_today' => $totalReqs,
                'pageviews_today' => $totalReqs * rand(3, 6),
                'avg_session_duration' => rand(120, 360),
                'bounce_rate' => round(rand(250, 450) / 10, 1),
                'avg_response_time_ms' => rand(50, 400),
                'slow_requests' => $slowReqs,
                'slow_request_pct' => round(($slowReqs / max($totalReqs, 1)) * 100, 1),
                'error_requests' => $errorReqs,
                'error_rate_pct' => round(($errorReqs / max($totalReqs, 1)) * 100, 1),
                'top_pages' => array_map(fn($p) => ['page' => $p, 'views' => rand(50, 800)],
                    $this->wisataPages),
                'top_referrers' => array_map(fn($r) => ['source' => $r, 'visits' => rand(30, 500)],
                    array_slice($this->referrers, 0, 6)),
                'device_breakdown' => [
                    ['device' => 'Mobile', 'percent' => rand(55, 70)],
                    ['device' => 'Desktop', 'percent' => rand(20, 35)],
                    ['device' => 'Tablet', 'percent' => rand(3, 10)],
                ],
            ],
        ]);
    }

    // ══════════════════════════════════════════════════
    // 5. WEBSITE HOURLY TRAFFIC (chart data)
    // ══════════════════════════════════════════════════
    public function trafficHourly(): JsonResponse
    {
        $hours = [];
        for ($h = 0; $h < 24; $h++) {
            $isPeak = $h >= 8 && $h <= 22;
            $visitors = $isPeak ? rand(80, 350) : rand(10, 60);
            $hours[] = [
                'hour' => str_pad($h, 2, '0', STR_PAD_LEFT) . ':00',
                'visitors' => $visitors,
                'pageviews' => $visitors * rand(2, 5),
                'unique_visitors' => (int)($visitors * (rand(60, 85) / 100)),
            ];
        }

        return response()->json(['success' => true, 'data' => $hours]);
    }

    // ══════════════════════════════════════════════════
    // 6. WEBSITE LIVE ACCESS LOG
    // ══════════════════════════════════════════════════
    public function trafficLive(): JsonResponse
    {
        $feed = [];
        $count = rand(6, 15);

        for ($i = 0; $i < $count; $i++) {
            $secondsAgo = $i * rand(2, 10);
            // Occasional slow response (>1s) to simulate real traffic spikes
            $isSlow = rand(0, 100) > 85;
            $isError = rand(0, 100) > 92;
            $feed[] = [
                'id' => 'REQ' . rand(100000, 999999),
                'timestamp' => now()->subSeconds($secondsAgo)->toIso8601ZuluString(),
                'time' => now()->subSeconds($secondsAgo)->format('H:i:s'),
                'ip' => $this->randIP(),
                'page' => $this->pick($this->wisataPages),
                'method' => $this->pick(['GET', 'GET', 'GET', 'POST']),
                'status_code' => $isError ? $this->pick([500, 502, 503, 504]) : ($isSlow ? $this->pick([200, 200, 408]) : $this->pick([200, 200, 200, 301, 304])),
                'browser' => $this->pick($this->browsers),
                'device' => $this->pick($this->devices),
                'region' => $this->pick($this->regions),
                'referrer' => $this->pick($this->referrers),
                'response_time_ms' => $isError ? rand(3000, 10000) : ($isSlow ? rand(1000, 5000) : rand(15, 600)),
                'session_duration' => rand(5, 300),
            ];
        }

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601ZuluString(),
            'data' => $feed,
        ]);
    }

    // ══════════════════════════════════════════════════
    // 7. PAYMENT / TRANSACTION DASHBOARD
    // ══════════════════════════════════════════════════
    public function paymentDashboard(): JsonResponse
    {
        $trxCount = rand(2000, 8000);
        $failedCount = rand(20, (int)($trxCount * 0.15));
        $successRate = round((($trxCount - $failedCount) / max($trxCount, 1)) * 100, 1);

        return response()->json([
            'success' => true,
            'data' => [
                'volume_today' => rand(800, 2500) * 1000000,
                'trx_count_today' => $trxCount,
                'failed_count_today' => $failedCount,
                'success_rate' => $successRate,
                'active_users' => rand(2000, 6000),
                'avg_trx_value' => rand(35, 150) * 1000,
                'peak_tps' => rand(20, 80),
            ],
        ]);
    }

    // ══════════════════════════════════════════════════
    // 8. PAYMENT LIVE TRANSACTIONS
    // ══════════════════════════════════════════════════
    public function paymentLive(): JsonResponse
    {
        $tickets = [
            ['type'=>'wisata','name'=>'Tiket Owabong Waterpark','range'=>[25000,75000]],
            ['type'=>'wisata','name'=>'Tiket Goa Lawa','range'=>[10000,25000]],
            ['type'=>'wisata','name'=>'Tiket Taman Aquatica','range'=>[15000,50000]],
            ['type'=>'wisata','name'=>'Tiket Sanggaluri Park','range'=>[20000,60000]],
            ['type'=>'wisata','name'=>'Tiket Pendakian Gunung Slamet','range'=>[15000,30000]],
            ['type'=>'wisata','name'=>'Tiket Curug Cipendok','range'=>[10000,20000]],
            ['type'=>'event','name'=>'Festival Batik Purbalingga 2026','range'=>[50000,150000]],
            ['type'=>'event','name'=>'Konser Musik Alun-Alun','range'=>[25000,100000]],
            ['type'=>'event','name'=>'Pameran UMKM Purbalingga','range'=>[10000,25000]],
            ['type'=>'event','name'=>'Festival Kuliner Nusantara','range'=>[15000,50000]],
            ['type'=>'wisata','name'=>'Tiket Desa Wisata Karangbanjar','range'=>[10000,35000]],
            ['type'=>'wisata','name'=>'Tiket Buper Munjul Luhur','range'=>[15000,40000]],
        ];

        $methods = ['QRIS', 'VA BCA', 'VA BNI', 'VA Mandiri', 'GoPay', 'OVO', 'Dana'];

        $feed = [];
        $count = rand(5, 12);

        for ($i = 0; $i < $count; $i++) {
            $t = $this->pick($tickets);
            $secondsAgo = $i * rand(3, 12);
            $qty = rand(1, 5);
            $unitPrice = round(rand($t['range'][0], $t['range'][1]) / 1000) * 1000;
            $amount = $unitPrice * $qty;
            $statusRand = rand(0, 100);
            $status = $statusRand > 88 ? 'failed' : ($statusRand > 75 ? 'pending' : 'success');

            $feed[] = [
                'trx_id' => 'TKT' . date('ymd') . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT),
                'timestamp' => now()->subSeconds($secondsAgo)->toIso8601ZuluString(),
                'time' => now()->subSeconds($secondsAgo)->format('H:i:s'),
                'user' => $this->pick($this->users),
                'ip' => $this->randIP(),
                'type' => $t['type'],
                'description' => $t['name'],
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'amount' => $amount,
                'fee' => rand(0, 2500),
                'status' => $status,
                'payment_method' => $this->pick($methods),
                'failure_reason' => $status === 'failed' ? $this->pick([
                    'insufficient_balance', 'payment_timeout', 'bank_declined', 'network_error',
                ]) : null,
            ];
        }

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601ZuluString(),
            'data' => $feed,
        ]);
    }

    // ══════════════════════════════════════════════════
    // 9. SECURITY ALERTS
    // ══════════════════════════════════════════════════
    public function securityAlerts(): JsonResponse
    {
        $alerts = [];
        $count = rand(2, 6);

        $issues = [
            ['msg'=>'Brute Force Login Attempt','sev'=>'critical'],
            ['msg'=>'Suspicious IP Access Pattern','sev'=>'warning'],
            ['msg'=>'Multiple Failed Payments','sev'=>'error'],
            ['msg'=>'Unusual Transaction Amount','sev'=>'warning'],
            ['msg'=>'Account Takeover Attempt','sev'=>'critical'],
            ['msg'=>'Rate Limit Exceeded','sev'=>'warning'],
            ['msg'=>'SQL Injection Attempt','sev'=>'critical'],
            ['msg'=>'XSS Payload Detected','sev'=>'error'],
        ];

        for ($i = 0; $i < $count; $i++) {
            $issue = $this->pick($issues);
            $minutesAgo = $i * rand(2, 30);
            $alerts[] = [
                'id' => 'SEC' . rand(10000, 99999),
                'timestamp' => now()->subMinutes($minutesAgo)->toIso8601ZuluString(),
                'time' => now()->subMinutes($minutesAgo)->format('H:i:s'),
                'user' => $this->pick($this->users),
                'ip' => $this->randIP(),
                'description' => $issue['msg'],
                'severity' => $issue['sev'],
                'resolved' => rand(0, 100) > 70,
            ];
        }

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601ZuluString(),
            'data' => $alerts,
        ]);
    }
}
