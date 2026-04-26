<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class AlertRule extends Model {
    protected $table = 'alert_rules';
    protected $primaryKey = 'rule_id';
    protected $guarded = [];
}
