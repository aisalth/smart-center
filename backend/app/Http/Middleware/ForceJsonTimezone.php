<?php

namespace App\Http\Middleware;

use Carbon\Carbon;
use Closure;

class ForceJsonTimezone
{
    public function handle($request, Closure $next)
    {
        Carbon::macro('jsonSerialize', function () {
            return $this->setTimezone('Asia/Jakarta')->format('Y-m-d H:i:s');
        });

        return $next($request);
    }
}