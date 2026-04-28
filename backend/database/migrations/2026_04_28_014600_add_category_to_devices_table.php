<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->string('category', 16)->default('snmp')->after('type'); // 'snmp' atau 'docker'
        });

        // Set device yang namanya mengandung 'zaki' sebagai docker
        DB::table('devices')
            ->where('hostname', 'LIKE', '%zaki%')
            ->orWhere('sysName', 'LIKE', '%zaki%')
            ->update(['category' => 'docker']);
    }

    public function down(): void
    {
        Schema::table('devices', function (Blueprint $table) {
            $table->dropColumn('category');
        });
    }
};
