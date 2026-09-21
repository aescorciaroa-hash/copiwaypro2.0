<?php

namespace App\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Models\DashboardSummary;

class DashboardController extends Controller
{
    public function summary(Request $request): void
    {
        $this->json(DashboardSummary::summaryForToday());
    }
}
