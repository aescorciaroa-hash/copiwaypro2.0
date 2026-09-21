<?php

class DashboardController {

    public function summary() {
        global $conn;
        responderJson((new Panel($conn))->resumenDeHoy());
    }
}
