<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Controller;
use App\Core\Request;
use App\Models\CashClosingReport;
use App\Services\CashClosingService;
use Throwable;

class CashClosingController extends Controller
{
    /** Genera y archiva el cierre de caja del día para el admin autenticado. */
    public function store(Request $request): void
    {
        try {
            $report = CashClosingService::generate(Auth::id());
            $this->json($report, 201);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 409);
        }
    }

    /** Historial de cierres ya generados (para auditoría/consulta). */
    public function index(Request $request): void
    {
        $this->json(CashClosingReport::byAdmin(Auth::id()));
    }

    public function show(Request $request, string $id): void
    {
        try {
            $this->json(CashClosingService::report($id));
        } catch (Throwable $e) {
            $this->error('Cierre no encontrado.', 404);
        }
    }
}
