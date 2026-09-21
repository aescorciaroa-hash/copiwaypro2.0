<?php
// Controlador de paginas (SPA): comprueba sesion/rol (ya lo hizo despacharPagina
// para las rutas protegidas), prepara los datos iniciales de la pagina y monta
// el mismo componente React de siempre. Nunca genera HTML/CSS aqui.

class PaginaController {

    public function landing() {
        $this->render('landing');
    }

    public function login() {
        $this->render('login');
    }

    public function register() {
        $this->render('registro');
    }

    public function forgotPassword() {
        $this->render('recuperar');
    }

    public function admin() {
        $this->render('admin');
    }

    public function client() {
        $this->render('cliente');
    }

    public function kitchen() {
        $this->render('cocina');
    }

    public function delivery() {
        $this->render('domiciliario');
    }

    private function render($vista) {
        global $conn;
        $auth = new Autenticacion($conn);
        $haySesion = $auth->haySesion();

        $datos = [
            'usuario' => $haySesion ? $auth->usuarioActual() : null,
            'rol' => $haySesion ? $auth->rolActual() : null,
            'csrfToken' => csrfToken(),
            'settings' => (new Configuracion($conn))->obtener(),
        ];

        mostrarVista($vista, ['datos' => $datos]);
    }
}
