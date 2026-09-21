<?php
// Tabla de paginas: 'ruta' => [Controlador, accion, roles].
// roles = [] significa publica (sin sesion). El componente React montado es
// el mismo para todas (ver app/Views/paginas/*.php); lo que cambia por pagina
// es el control de sesion/rol hecho aqui, antes de servir el HTML.

return [
    '/' => ['PaginaController', 'landing', []],
    '/login' => ['PaginaController', 'login', []],
    '/register' => ['PaginaController', 'register', []],
    '/forgot-password' => ['PaginaController', 'forgotPassword', []],
    '/admin' => ['PaginaController', 'admin', ['admin']],
    '/client' => ['PaginaController', 'client', ['client']],
    '/kitchen' => ['PaginaController', 'kitchen', ['kitchen']],
    '/delivery' => ['PaginaController', 'delivery', ['delivery']],
];
