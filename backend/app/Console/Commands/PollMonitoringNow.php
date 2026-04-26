<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Jobs\PollMonitoringApiJob;
use Exception;

class PollMonitoringNow extends Command
{
    protected $signature = 'monitoring:poll';
    protected $description = 'Poll API Monitoring Data Sekarang (Sinkron)';

    public function handle()
    {
        $this->info("Memulai polling API Monitoring...");
        
        try {
            PollMonitoringApiJob::dispatchSync();
            $this->info("Berhasil melakukan polling dan menyimpan data ke DB.");
            return Command::SUCCESS;
        } catch (Exception $e) {
            $this->error("Gagal melakukan polling: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}