# MANUAL TÉCNICO Y DE USUARIO — HAMBURGUER COPIWAY
## Sistema Integrado de Automatización para Dark Kitchen

Este documento detalla la arquitectura, lógica de negocio, módulos y flujos operativos del sistema **Hamburguer Copiway**.

---

## 1. VISIÓN GENERAL
Hamburguer Copiway es una plataforma diseñada para gestionar una **Dark Kitchen** (Cocina Oculta). El sistema centraliza la recepción de pedidos, la gestión de inventario por recetas, la priorización en cocina y la logística de entrega, eliminando el desorden de los registros manuales.

---

## 2. ROLES Y ACCESOS (RBAC)
El sistema utiliza un Control de Acceso Basado en Roles para garantizar la seguridad y privacidad:

*   **Administrador**: Control total del sistema (Inventario, Precios, Empleados, Cierre de Caja).
*   **Ayudante de Cocina**: Gestiona el tablero Kanban de preparación (KDS).
*   **Domiciliario**: Gestiona las entregas activas con mapas y contacto al cliente.
*   **Cliente**: Usuario final que realiza compras, acumula puntos y rastrea sus pedidos.
*   **Programador**: Rol técnico para configuración inicial y mantenimiento de base de datos.

**Jerarquía de Creación:**
1. El **Programador** crea la cuenta maestra del Administrador.
2. El **Administrador** crea las cuentas de Cocina y Domiciliarios.
3. El **Cliente** se registra de forma autónoma aceptando la política de Habeas Data.

---

## 3. REGLAS DE NEGOCIO INQUEBRANTABLES
1.  **Cero Crédito**: Todo pedido web debe estar pagado antes de llegar a cocina.
2.  **Tarifa Plana de Domicilio**: Costo de envío único configurable por el administrador.
3.  **Punto de No Retorno**: Una vez pagado, el pedido no puede ser editado ni cancelado por el cliente.
4.  **Habeas Data**: El registro de clientes exige la aceptación de términos legales.
5.  **Horario Automático**: El botón "Pagar" se bloquea fuera del horario de atención configurado.
6.  **Cero IVA**: El sistema opera con precios netos finales para simplificar la contabilidad.

---

## 4. MÓDULOS EN DETALLE

### A. Módulo Administrador
*   **Dashboard de Control**: Gráficos de ventas, productos más vendidos y métricas en tiempo real.
*   **Gestión de Catálogo**: CRUD de productos donde se definen precios, fotos y categorías.
*   **Escandallo (Recetas)**: Configuración de qué insumos gasta cada producto.
*   **Insumos y Desechables**: Gestión unificada de carnes, vegetales y empaques en una sola base de datos de inventario.
*   **Abastecimiento Express**: Botón "+" para cargar stock rápidamente tras una compra sin formularios complejos.
*   **Cierre de Caja**: Consolidación de ingresos (Efectivo vs Digital) y reporte de insumos consumidos.
*   **Logs de Inventario**: Registro automático de quién y cuándo ajustó las existencias de cada ingrediente.

### B. Módulo Cliente
*   **Creador Interactivo**: Permite armar productos capa por capa, bloqueando ingredientes agotados en tiempo real.
*   **Fidelización**: Acumulación automática de puntos y descuentos especiales en el día del cumpleaños.
*   **Recompra en 1 Clic**: Botón para repetir exactamente el último pedido realizado.
*   **Rastreo en Tiempo Real**: Visualización del estado: `Recibido` -> `Preparación` -> `Listo` -> `En Camino`.

### C. Módulo Cocina (KDS)
*   **Tablero Kanban**: Columnas de `Pendientes`, `En Preparación` y `Listos`.
*   **Alertas Visuales**: Resaltado en **ROJO** para ingredientes quitados ("SIN") y **VERDE** para extras.
*   **Impresión de Tirilla**: Generación de stickers con datos del cliente y pedido para sellar bolsas.
*   **Alertas de Stock**: Notificaciones cuando un ingrediente está por agotarse.

### D. Módulo Domiciliario
*   **Logística Móvil**: Vista optimizada para celulares.
*   **Mapas Interactivos**: Integración con Google Maps/Waze para trazar rutas de entrega.
*   **Contacto Seguro**: Botón de llamada/WhatsApp visible solo mientras el pedido está "En Camino".

---

## 5. FLUJOS PASO A PASO

### Flujo de un Pedido (Ciclo de Vida)
1.  **Creación**: El cliente selecciona productos, personaliza y paga.
2.  **Recepción**: El pedido aparece automáticamente en la columna `Pendientes` de Cocina. El Administrador recibe alerta sonora.
3.  **Inventario**: El sistema descuenta automáticamente ingredientes y empaques del stock.
4.  **Preparación**: Cocina mueve el pedido a `En Preparación`. El cliente ve el cambio de estado.
5.  **Despacho**: Cocina marca como `Listo`. Se notifica al domiciliario y al cliente.
6.  **Entrega**: El domiciliario marca `En Camino` (envía WhatsApp al cliente) y finalmente `Entregado` al llegar.

### Flujo de Cierre de Caja
1.  El administrador presiona "Cerrar Caja" al final del turno.
2.  El sistema suma todas las ventas digitales y las ventas en efectivo registradas manualmente.
3.  Se genera un reporte PDF con la ganancia neta y el listado de insumos consumidos.
4.  El sistema se reinicia (limpia órdenes del día) para la siguiente jornada.

---

## 6. LÓGICA TÉCNICA DE INVENTARIO
El sistema diferencia entre:
*   **Ingredientes**: Son parte de la receta y se muestran en la comanda de cocina (Ej: Carne, Queso).
*   **Empaques**: Son desechables necesarios para el despacho (Ej: Caja de Hamburguesa, Servilletas). Se descuentan del stock al venderse el producto, pero no aparecen en la lista de ingredientes del cocinero para mantener la pantalla limpia.

---

## 7. SEGURIDAD Y DATOS
*   **Contraseñas**: Encriptadas mediante hashing seguro.
*   **Persistencia**: Sincronización en tiempo real mediante un sistema de datos centralizado para que todos los roles vean los cambios al instante.
*   **Privacidad**: Los datos de contacto del cliente se ocultan al domiciliario una vez finalizada la entrega.

---

## 8. DESCRIPCIÓN DETALLADA DE VISTAS Y ACCIONES POR ROL

### A. FLUJO DEL ADMINISTRADOR (Control Maestro)
El administrador es el corazón operativo del sistema. Su vista es un centro de mando integral.

#### Vista: Dashboard Principal
*   **Métricas en Tiempo Real**: Visualiza el total de ventas del día, el número de pedidos y el rendimiento de los productos.
*   **Gráficos de Tendencia**: Gráficos de barras y circulares que muestran las horas pico y las categorías más populares.
*   **Acción: Cierre de Caja**: Al presionar este botón, el sistema bloquea nuevas ventas, suma ingresos (efectivo + digital), calcula el consumo de insumos y genera un reporte PDF. **Resultado**: El sistema queda en limpio para el siguiente turno.

#### Vista: Comandas Activas (KDS Admin)
*   **Monitoreo**: El admin ve exactamente lo mismo que cocina, pero con poder de edición.
*   **Acción: Registro de Pedido Externo**: Permite al admin digitar un pedido que llega por WhatsApp o llamada. **Botón**: "Registrar Venta Manual". **Resultado**: El pedido viaja a cocina como si fuera un pedido web, permitiendo pago en efectivo al entregar.
*   **Acción: Editar Dirección**: Si un cliente se equivoca, el admin puede corregir la dirección en un pedido activo. **Resultado**: El mapa del domiciliario se actualiza automáticamente.

#### Vista: Inventario (Abastecimiento Express)
*   **Control de Stock**: Lista de todos los ingredientes y empaques con alertas de color si el stock es bajo.
*   **Acción: Botón "+"**: Permite sumar unidades rápidamente tras hacer mercado. **Resultado**: El stock se actualiza al instante sin necesidad de abrir formularios complejos.

#### Vista: Gestión de Catálogo y Menú
*   **Acción: Crear/Editar Producto**: Define nombre, precio, imagen y categoría.
*   **Acción: Configurar Escandallo**: Abre un panel para asignar ingredientes y empaques. **Resultado**: Establece cuánto se descuenta del inventario por cada venta.

#### Vista: Gestión Humana
*   **Acción: Crear Empleado**: El admin genera el usuario y contraseña para cocina y domiciliarios.
*   **Acción: Soft Delete (Dar de Baja)**: Revoca el acceso a un empleado. **Resultado**: El empleado ya no puede entrar al sistema, pero su historial de trabajo se mantiene para auditoría.

---

### B. FLUJO DEL CLIENTE (Experiencia de Compra)
Diseñado para ser rápido, visual y sin fricciones.

#### Vista: Catálogo y Menú
*   **Navegación**: Filtros por categorías (Hamburguesas, Perros, Extras, etc.).
*   **Acción: Recompra 1-Clic**: Si el cliente ya ha pedido antes, aparece un botón para repetir su última orden. **Resultado**: Ahorra tiempo al reconstruir el carrito automáticamente.

#### Vista: Creador Interactivo (Minijuego)
*   **Personalización**: El cliente ve una hamburguesa base y puede añadir o quitar capas.
*   **Lógica de Agotado**: Si un ingrediente llega a 0 en el inventario del admin, la opción en el minijuego se bloquea con el aviso "Agotado".

#### Vista: Carrito y Checkout
*   **Acción: Pagar**: Solo se activa si el local está abierto (según el horario configurado). **Resultado**: Al confirmar, el pedido es irreversible (Punto de No Retorno).
*   **Costo de Envío**: Se suma automáticamente la tarifa plana configurada por el admin.

#### Vista: Rastreo de Pedido
*   **Estados**: Una barra de progreso que se mueve en tiempo real según las acciones de Cocina y el Domiciliario.
*   **Botón de Contacto**: Aparece un botón de WhatsApp para hablar con el domiciliario, pero **solo** cuando el pedido está "En Camino". Desaparece al ser entregado.

---

### C. FLUJO DEL AYUDANTE DE COCINA (KDS)
Interfaz de alto contraste, diseñada para ser usada con manos ocupadas y en ambiente de calor.

#### Vista: Tablero Kanban (Comandas)
*   **Columna Pendientes**: Pedidos recién pagados entran aquí con una alerta sonora.
*   **Columna En Preparación**: El cocinero arrastra o presiona el botón para indicar que está trabajando en el pedido.
*   **Columna Listos**: El pedido se mueve aquí cuando la comida está empacada.

#### Acciones y Botones:
*   **Resaltado de Personalización**: El sistema lee la receta y resalta en **ROJO** lo que NO debe llevar y en **VERDE** los extras.
*   **Botón: Imprimir Tirilla**: Genera una etiqueta con el nombre del cliente, dirección y detalle del pedido para pegar en la bolsa.
*   **Botón: Marcar como Listo**: **Resultado**: Notifica al domiciliario que hay un paquete esperando y avisa al cliente que su comida está terminada.

---

### D. FLUJO DEL DOMICILIARIO (Última Milla)
Interfaz móvil centrada en la ubicación y la rapidez de entrega.

#### Vista: Pedidos por Entregar
*   **Lista de Espera**: Muestra los pedidos marcados como "Listos" por cocina.
*   **Acción: Botón "En Camino"**: El domiciliario toma el pedido e inicia la ruta. **Resultado**: Envía un mensaje automático de WhatsApp al cliente informando que el domiciliario ya salió.

#### Vista: Mapa Interactivo
*   **Navegación**: Muestra un mapa con la ubicación del cliente.
*   **Botón: Abrir en GPS**: Abre Google Maps o Waze con la ruta optimizada.

#### Vista: Finalización
*   **Acción: Botón "Entregado"**: Cierra el ciclo del pedido. **Resultado**: El pedido desaparece de la vista activa y suma la ganancia/pago al reporte diario del administrador.

---

## 9. ¿QUÉ PASA SI...? (Casos de Borde)

*   **¿Si se agota un ingrediente?**: El sistema lo bloquea en el menú del cliente al instante, evitando ventas de productos que no se pueden preparar.
*   **¿Si el administrador cambia un precio?**: Los pedidos que ya están en el carrito o pagados mantienen el precio anterior; el cambio solo aplica a pedidos nuevos.
*   **¿Si el domiciliario no encuentra la dirección?**: Tiene un botón de llamada directa al cliente que solo funciona mientras el pedido está activo (protección de datos).
*   **¿Si el local está cerrado?**: El cliente puede ver el menú pero el botón de pago muestra un aviso indicando que el local está fuera de horario.

---

## 10. GUÍA DE BOTONES Y FUNCIONALIDADES POR MÓDULO (DICCIONARIO DE ACCIONES)

A continuación, se detalla cada botón crítico del sistema, su ubicación y el efecto inmediato que genera en la base de datos y la interfaz de otros usuarios.

### A. Módulo del Cliente (Experiencia de Usuario)

*   **Botón: "Agregar al Carrito" (Menú)**:
    *   **Acción**: Guarda el producto seleccionado en el almacenamiento local del navegador (carrito).
    *   **Qué pasa**: El contador del carrito en la barra de navegación aumenta. Si el producto ya existía, suma la cantidad.
*   **Botón: "Personalizar" (Icono de lápiz/ajustes)**:
    *   **Acción**: Abre el **Creador Interactivo**.
    *   **Qué pasa**: Permite quitar ingredientes o añadir extras. El precio se recalcula en tiempo real mientras el usuario interactúa.
*   **Botón: "Recompra 1-Clic" (Perfil/Inicio)**:
    *   **Acción**: Consulta la última orden finalizada en la base de datos centralizada y la clona.
    *   **Qué pasa**: Llena el carrito instantáneamente con los mismos productos y personalizaciones que el pedido anterior.
*   **Botón: "Pagar" (Checkout)**:
    *   **Acción**: Ejecuta la lógica de validación de horario y stock.
    *   **Qué pasa**: Si todo es correcto, registra la orden en estado `pagado` en el motor de persistencia centralizado. **Efecto Dominó**: 
        1. Se descuenta el stock del inventario.
        2. Aparece en el KDS de cocina con alerta sonora.
        3. El cliente ya no puede editar ni cancelar (Punto de No Retorno).

### B. Módulo del Administrador (Gestión Maestra)

*   **Botón: "+" (Inventario Express)**:
    *   **Acción**: Incrementa la cantidad de un insumo seleccionado.
    *   **Qué pasa**: Actualiza el campo `stock` en la base de datos. Si el producto estaba "Agotado" para el cliente, se habilita nuevamente de forma automática.
*   **Botón: "Cerrar Caja" (Dashboard)**:
    *   **Acción**: Dispara el proceso de consolidación diaria.
    *   **Qué pasa**: 
        1. Suma todos los pagos marcados como `entregado`.
        2. Genera un documento PDF con el resumen de ventas y gastos de insumos.
        3. Cambia el estado de las órdenes del día a `archivado`, dejando la lista de comandas limpia para el nuevo día.
*   **Botón: "Registrar Venta Manual" (Admin KDS)**:
    *   **Acción**: Abre un formulario para pedidos de WhatsApp/Llamada.
    *   **Qué pasa**: Crea una orden con estado `pago_efectivo`. Al enviarse, viaja directamente a la columna de "Pendientes" en cocina.
*   **Botón: "Guardar Cambios" (Edición de Menú)**:
    *   **Acción**: Actualiza las propiedades del producto (Precio, Foto, Categoría).
    *   **Qué pasa**: Todos los clientes ven el nuevo precio al instante. **Nota**: No afecta a los pedidos que ya fueron pagados o están en carritos activos para proteger la oferta original.

### C. Módulo de Cocina (KDS - Kitchen Display System)

*   **Botón: "Empezar Preparación" (Flecha en Comanda)**:
    *   **Acción**: Mueve la tarjeta del pedido de la columna "Pendientes" a "En Preparación".
    *   **Qué pasa**: El cliente ve en su pantalla de rastreo que su pedido ha comenzado a ser cocinado.
*   **Botón: "Imprimir Tirilla" (Icono de impresora)**:
    *   **Acción**: Genera una vista de impresión optimizada para impresoras térmicas.
    *   **Qué pasa**: Envía el comando de impresión con el nombre del cliente, dirección, teléfono y el detalle de "CON/SIN" ingredientes.
*   **Botón: "Marcar como Listo" (Flecha hacia columna final)**:
    *   **Acción**: Cambia el estado de la orden a `listo`.
    *   **Qué pasa**: 
        1. El pedido aparece en la aplicación del domiciliario.
        2. El cliente recibe una notificación visual de que su pedido está listo para despacho.

### D. Módulo del Domiciliario (Logística)

*   **Botón: "En Camino" (Tarjeta de Entrega)**:
    *   **Acción**: Asigna el domiciliario a la orden y cambia el estado a `en_camino`.
    *   **Qué pasa**: 
        1. Se activa el botón de contacto con el cliente.
        2. Se dispara un mensaje automático (vía API o enlace) al WhatsApp del cliente con el aviso de salida.
*   **Botón: "Ir al Mapa" (Icono de ubicación)**:
    *   **Acción**: Detecta las coordenadas o dirección de la orden.
    *   **Qué pasa**: Abre la aplicación de mapas externa (Google Maps/Waze) con la ruta ya trazada desde el local hasta la casa del cliente.
*   **Botón: "Entregado" (Check final)**:
    *   **Acción**: Marca la orden como `finalizada`.
    *   **Qué pasa**: 
        1. Desaparece de la ruta activa del domiciliario.
        2. Se deshabilita el acceso a los datos de contacto del cliente (privacidad).
        3. El pago se suma oficialmente al reporte de caja del administrador.

---

## 11. PROFUNDIZACIÓN DE FUNCIONES CLAVE (PASO A PASO DETALLADO)

Para una comprensión absoluta del sistema, aquí se explica la lógica interna de las funciones más avanzadas:

### 11.1 El Creador Interactivo de Hamburguesas (Lógica de Capas)
Este no es un simple formulario, es un simulador visual que interactúa con el inventario real:
1.  **Selección**: El cliente abre un producto base (Ej: Hamburguesa de la Casa).
2.  **Consulta de Stock**: El sistema verifica en milisegundos qué ingredientes tiene esa receta.
3.  **Visualización**: Muestra los ingredientes en una lista. Si el Administrador marcó que el "Pan" tiene stock 0, el cliente verá el ingrediente con una opacidad baja y un aviso de "AGOTADO".
4.  **Acción de Quitar**: Al presionar "Sin Cebolla", el sistema marca ese ítem para que el descuento de inventario **NO** se aplique a la cebolla, ahorrando costos al local.
5.  **Acción de Agregar**: Al añadir "Extra Queso", el sistema busca el precio del extra en la configuración del admin y lo suma al subtotal.

### 11.2 Sistema de Fidelización (Puntos y Cumpleaños)
Lógica automática para retener clientes:
*   **Puntos**: Por cada $1.000 pesos de compra, el sistema asigna 1 punto al perfil del cliente. Estos puntos se almacenan de forma persistente y pueden ser consultados en el perfil.
*   **Cumpleaños**: El sistema lee la fecha de nacimiento del registro. El día del cumpleaños, el checkout detecta la fecha y aplica un descuento del 15% automáticamente sobre el total de productos (no aplica al domicilio).

### 11.3 Cierre de Caja e Inteligencia de Inventario
¿Cómo sabe el sistema si falta dinero o insumos?
1.  **Conteo de Ventas**: El sistema filtra todas las órdenes del día con estado `entregado`.
2.  **Cruce de Recetas**: Por cada hamburguesa vendida, el sistema suma cuánta carne, pan y vegetales debieron consumirse teóricamente.
3.  **Generación del PDF**: Crea un documento profesional que muestra:
    *   Ventas totales digitales (transacciones verificadas).
    *   Ventas totales en efectivo (dinero que el admin debe tener en mano).
    *   Lista de insumos que salieron de la bodega.
4.  **Reinicio Seguro**: Al finalizar, el sistema limpia la pantalla pero **mantiene** los datos en el historial histórico para reportes mensuales.

### 11.4 Gestión Humana y "Soft Delete"
Seguridad ante rotación de personal:
1.  **Creación**: El admin asigna un nombre y clave. El sistema genera un ID único.
2.  **Desactivación**: Si un empleado es despedido, el admin presiona "Dar de Baja".
3.  **Lógica Interna**: El sistema no borra al usuario (para no romper el historial de quién preparó qué pedido), sino que cambia su estado a `inactivo`.
4.  **Bloqueo**: Al intentar iniciar sesión, el sistema verifica el estado `inactivo` y rechaza el acceso, notificando al usuario que contacte al administrador.

### 11.5 Protección de Datos (Habeas Data)
Cumplimiento legal automático:
*   En el registro, el checkbox de "Acepto términos" no es decorativo. Si no está marcado en `true`, la función de "Registrar" devuelve un error de validación y bloquea la creación del perfil en la base de datos centralizada.

---

## 12. ARQUITECTURA DE PERSISTENCIA Y TIEMPO REAL

Para entender "por qué todo cambia solo" en las pantallas, es necesario conocer la infraestructura invisible:

### 12.1 El Corazón: Sincronización y Persistencia Centralizada
El sistema no requiere que nadie "refresque" la página. Utiliza escuchas activas (*Listeners*):
*   **Sincronización Multi-Pantalla**: Cuando el Administrador cambia el precio de una hamburguesa, el motor de datos envía una señal a todos los clientes conectados. Sus pantallas se actualizan en menos de 1 segundo sin recargar la página.
*   **Persistencia Total**: Si el Administrador cierra el navegador accidentalmente, al abrirlo de nuevo encontrará todo exactamente como estaba. Las órdenes activas, el stock y el carrito del cliente viven en la nube, no solo en la memoria del computador.

### 12.2 Ciclo de Vida de una Orden en la Base de Datos
Una orden no es solo un papel, es un objeto que cambia de estado:
1.  **Estado `cart`**: Existe solo en el navegador del cliente.
2.  **Estado `pagado`**: Se crea en la base de datos. Se dispara la alerta sonora en Cocina.
3.  **Estado `preparacion`**: El Ayudante de Cocina reclama la orden. El timestamp de inicio se registra para medir eficiencia.
4.  **Estado `listo`**: El pedido se hace visible para el Domiciliario.
5.  **Estado `entregado`**: El pedido se oculta de las vistas operativas y se marca para el reporte de cierre de caja.

---

## 13. FLUJOS DE SEGURIDAD Y AUDITORÍA (AUDIT LOGS)

El sistema vigila las acciones críticas para evitar fraudes o errores humanos:

### 13.1 El Log de Inventario
Cada vez que un administrador ajusta el stock manualmente, el sistema registra: **¿Quién lo hizo?**, **¿A qué hora?** y **¿Qué cantidad se añadió?**. Esto permite mantener un control estricto sobre las entradas de mercancía y evitar descuadres sospechosos en el reporte de cierre.

### 13.2 Validación de Sesiones
*   **Expiración**: Por seguridad, si una sesión de empleado permanece inactiva por mucho tiempo, el sistema solicita credenciales nuevamente.
*   **Protección de Rutas**: Si un Ayudante de Cocina intenta entrar manualmente a la URL de `/admin`, el sistema detecta que su rol no tiene permisos y lo redirige automáticamente a su panel de cocina.

---

## 14. ESCENARIOS OPERATIVOS CRÍTICOS (MANEJO DE CRISIS)

¿Qué pasa en situaciones extremas?

### 14.1 Pérdida de Conexión a Internet
*   **En Cocina**: El sistema detecta la desconexión y muestra un aviso visual. Los pedidos que ya estaban cargados permanecen visibles. Al volver el internet, el KDS se sincroniza automáticamente con las nuevas órdenes que entraron mientras estuvo offline.
*   **En el Cliente**: Si el cliente pierde internet durante el pago, el sistema bloquea la transacción para evitar cobros dobles o pedidos fantasma.

### 14.2 Error en la Dirección de Entrega
Si el cliente nota un error después de pagar:
1.  El cliente llama al local.
2.  El **Administrador** entra a "Comandas Activas".
3.  Presiona el botón de **"Editar Dirección"**.
4.  Ingresa la nueva dirección.
5.  **Al instante**, el Domiciliario ve el cambio en su mapa y recibe una alerta visual de "Dirección Actualizada".

### 14.3 Producto Agotado a Mitad de una Venta
Si un cliente tiene una hamburguesa en su carrito y, justo antes de pagar, otro cliente compra la última unidad disponible:
*   El sistema realiza una **validación de stock final** al presionar "Pagar".
*   Si ya no hay existencias, el pago se detiene y se le informa al cliente: *"Lo sentimos, uno de los productos en tu carrito se acaba de agotar"*. Esto evita que el local reciba un pedido que no puede cumplir.

---

## 15. SOPORTE Y MANTENIMIENTO
El sistema está diseñado para ser "cero mantenimiento":
*   **Backups**: El sistema en la nube realiza copias de seguridad automáticas de forma periódica.
*   **Escalabilidad**: El sistema soporta desde 10 hasta 10,000 pedidos diarios sin necesidad de cambios en el código.

---

## 16. GUÍA ESTRUCTURAL PARA CREACIÓN DE MOCKUPS (UI/UX)

Esta sección está diseñada específicamente para diseñadores UI/UX. Detalla la estructura visual, disposición de elementos (layout), botones y modales que debe tener cada pantalla en herramientas como Figma, Adobe XD o Sketch.

### 16.1 Generalidades de Diseño Global
*   **Tema (Theme)**: El sistema soporta Modo Claro y Modo Oscuro. En todas las vistas (excepto KDS de cocina, que es fijo en modo oscuro) debe existir un icono de "Sol/Luna" para cambiar el tema.
*   **Colores Corporativos**: El color principal de acento es un Naranja vibrante (brand-orange). Los fondos deben ser blancos/grises claros (Modo claro) y gris carbón/negro mate (Modo oscuro).
*   **Tipografía**: Sans-serif, limpia, moderna y legible (ej. Inter o Roboto).

---

### 16.2 Módulo de Autenticación (Auth)
Estas vistas son el punto de entrada para todos los usuarios.

#### Vista: Login (Inicio de Sesión)
*   **Layout**: Tarjeta blanca/oscura centrada en la pantalla sobre un fondo sutil o imagen difuminada.
*   **Elementos Visuales**:
    *   Logo de Hamburguer Copiway centrado en la parte superior.
    *   Campos de texto con iconos a la izquierda: "Correo Electrónico" (icono sobre) y "Contraseña" (icono candado, con botón de "ver/ocultar" a la derecha).
    *   Checkbox: "Recordarme".
    *   Enlace: "¿Olvidaste tu contraseña?" alineado a la derecha.
    *   **Botón Principal**: Botón ancho, color naranja, texto "Iniciar Sesión" con icono de flecha.
    *   Enlace inferior: "¿No tienes cuenta? Regístrate aquí".

#### Vista: Registro (Cliente)
*   **Layout**: Similar al Login pero con más campos, idealmente divididos en dos columnas si hay espacio, o lista vertical.
*   **Elementos Visuales**:
    *   Campos: Nombre completo, Número de celular, Correo, Contraseña, Confirmar Contraseña.
    *   **Campo Especial (Fecha de Nacimiento)**: Un DatePicker customizado o inputs de (Día/Mes/Año) para el sistema de cumpleaños.
    *   **Checkbox Obligatorio**: "Acepto las políticas de Tratamiento de Datos (Habeas Data)". (Sin esto, el botón principal está bloqueado/gris).
    *   **Botón Principal**: "Completar Registro" (Naranja).

#### Vista: Recuperar Contraseña
*   **Layout**: Tarjeta pequeña y simple.
*   **Elementos**: Texto explicativo, un input para "Correo o Celular registrado", Botón "Enviar código / enlace", y enlace "Volver al Login".

---

### 16.3 Módulo del Cliente (Experiencia de Compra)

#### Vista: Pantalla Principal (Catálogo / Landing)
*   **Layout**: Estilo E-commerce moderno.
*   **Barra Superior (Navbar)**: Logo a la izquierda. Centro: Barra de búsqueda. Derecha: Botón de "Perfil/Cumpleaños", Botón "Órdenes Activas" (si las hay), Botón del "Carrito" (con un badge/burbuja indicando el número de items), y Toggle de Tema (Sol/Luna).
*   **Hero Banner**: Imagen promocional grande y atractiva.
*   **Botón Flotante "Recompra 1 Clic"**: Visible en la parte superior si el usuario tiene historial.
*   **Grid de Catálogo**: Una cuadrícula de tarjetas de productos.
    *   **Tarjeta de Producto**: Foto grande, Nombre (bold), Descripción corta (gris), Precio grande (naranja), y Botón "Agregar" en la esquina.

#### Vista / Modal: Creador Interactivo (Personalización)
*   **Layout**: Modal (pop-up) grande que se abre al dar clic en un producto.
*   **Izquierda**: Foto del producto grande.
*   **Derecha**: Lista de ingredientes (Escandallo base).
    *   Cada ingrediente tiene botones circulares [+] y [-] o switches (Toggle).
    *   **Estado Agotado**: Si un ingrediente no tiene stock, su fila aparece en gris (opacidad baja), el botón de agregar está bloqueado y dice "AGOTADO".
    *   Sección inferior: "Extras" (con sus precios).
*   **Pie del Modal**: Subtotal recalculado en tiempo real, Botón "Confirmar y Agregar al carrito".

#### Vista: Carrito Lateral (Drawer) o Checkout
*   **Layout**: Panel que se desliza desde la derecha.
*   **Elementos**:
    *   Lista de productos seleccionados, mostrando debajo y en letra pequeña las personalizaciones (ej: "Sin Cebolla", "Extra Queso").
    *   Subtotal, **Costo Fijo de Domicilio** (visible y claro).
    *   Total Grande a Pagar.
    *   **Botón Principal**: "Ir a Pagar" o "Pagar con Wompi/MercadoPago".
    *   **Validación de Horario**: Si el local está cerrado, el botón es gris y muestra "Cerrado en este momento".

#### Vista: Rastreo de Orden
*   **Layout**: Vista limpia con el ID de la orden gigante en el centro.
*   **Elemento Principal**: Barra de progreso tipo "Steps" (1. Recibido, 2. En Cocina, 3. Listo, 4. En Camino).
*   **Botón Condicional**: Botón de WhatsApp/Llamar al domiciliario (Solo visible si el step actual es el 4 "En Camino").

---

### 16.4 Módulo del Administrador

#### Vista: Dashboard y Menú Lateral
*   **Layout Base**: Panel con una barra lateral (Sidebar) fija a la izquierda y el contenido principal a la derecha.
*   **Sidebar**: Enlaces con iconos: Dashboard, Menú/Productos, Inventario, Gestión Humana, Comandas, Configuración.
*   **Dashboard Principal**:
    *   Tarjetas superiores (KPIs): Total Ventas, Pedidos Activos, Pedidos Entregados.
    *   Gráficos: Ventas por hora, Top Productos.
    *   **Botón Rojo Principal**: "Cerrar Caja" (ubicado en un lugar estratégico, visible pero no fácil de presionar por accidente).

#### Vista: Gestión de Catálogo y Recetas
*   **Lista**: Tabla con miniatura de foto, Nombre, Categoría, Precio, y botones de "Editar/Borrar".
*   **Modal de Edición de Producto**:
    *   Campos básicos (Nombre, Descripción, Precio).
    *   **Sección de Escandallo**: Un buscador/dropdown para añadir ingredientes. Cada fila agregada muestra "Ingrediente", "Cantidad por porción".
    *   **Sección de Empaques**: Igual al escandallo, pero solo para agregar desechables (cajas, bolsas).

#### Vista: Inventario
*   **Layout**: Tabla grande de datos.
*   **Columnas**: Nombre, Categoría (Comida vs Empaques), Unidad de Medida, Stock Actual, Costo Unitario.
*   **Botón de Abastecimiento Express**: Un botón con el símbolo "+" en cada fila. Al presionarlo, sale un pop-up pequeño preguntando "¿Cuántas unidades ingresaron?" para sumar rápidamente.

#### Vista: Comandas del Administrador
*   **Layout**: Tabla o vista de tarjetas de los pedidos del día.
*   **Botón "Nueva Venta Manual"**: Abre un formulario para registrar un pedido telefónico.
*   **Botón "Editar Dirección"**: En los pedidos en curso, permite cambiar el destino del domicilio en tiempo real.

---

### 16.5 Módulo de Cocina (KDS - Kitchen Display System)

*   **Layout**: Diseño a pantalla completa (Fullscreen), sin sidebars para aprovechar todo el espacio visual. Tipografía extra grande, colores de altísimo contraste. (Por defecto, sugerido modo oscuro).
*   **Estructura Kanban**: 3 Columnas verticales enormes:
    1.  **Pendientes**: Color de cabecera gris/neutro.
    2.  **En Preparación**: Color de cabecera Amarillo/Naranja.
    3.  **Listos**: Color de cabecera Verde.
*   **La Comanda (Tarjeta de Pedido)**:
    *   Cabecera de la tarjeta: ID del pedido (#104) gigante y un temporizador (04:12 min).
    *   Cuerpo de la tarjeta: Lista de productos.
    *   **Regla Visual de Personalización (CRÍTICO)**: Todo lo que diga "SIN" (ej. Sin Tomate) debe ir en texto **ROJO BOLD**. Todo lo que diga "EXTRA" (ej. Extra Tocino) debe ir en texto **VERDE BOLD**.
    *   **Footer de la Tarjeta**:
        *   Botón de flecha o texto ("Preparar") para mover a la siguiente columna.
        *   **Botón de Impresión (Tirilla)**: Icono de impresora.

---

### 16.6 Módulo Domiciliario (Logística)

*   **Layout**: Mobile First (Diseñado principalmente para verse en pantallas de celular). Barra superior sencilla con nombre del domiciliario y un botón de cerrar sesión.
*   **Vista: Pedidos Asignados**:
    *   Tarjetas apiladas verticalmente de pedidos "Listos" esperando recogida.
    *   **Tarjeta**: Muestra la dirección en fuente grande, nombre del cliente, ID del pedido.
    *   **Botón Principal**: "Tomar Pedido y En Camino" (Desaparece la tarjeta de esta vista y pasa a la vista de "Ruta Activa").
*   **Vista: Ruta Activa**:
    *   **Mapa Integrado**: Un recuadro superior o modal interactivo con el pin de ubicación.
    *   **Botón "Abrir GPS"**: Para exportar las coordenadas a Waze o Google Maps.
    *   **Botón "Contactar"**: Icono de teléfono/WhatsApp para comunicarse con el cliente.
    *   **Botón "Entregado"**: Botón grande en la parte inferior, color verde, que cierra el ciclo del pedido.

---

## 17. ESPECIFICACIONES TÉCNICAS PARA IA GENERADORA DE MOCKUPS (PROMPTING PARA UI)

Esta sección está diseñada para ser copiada y pegada como contexto adicional en cualquier IA generativa de código UI (como ChatGPT, Claude, o v0.dev) para que pueda construir las vistas sin necesidad de imágenes de referencia. 

Si eres una IA leyendo esto para generar un componente, **DEBES SEGUIR ESTRICTAMENTE** las siguientes directrices estructurales y de clases CSS (preferiblemente Tailwind CSS).

### 17.1 Sistema de Diseño (Design Tokens en Tailwind)

*   **Paleta de Colores**:
    *   **Brand Primary (Naranja)**: `bg-orange-500`, `text-orange-500`, `border-orange-500` (Hover: `bg-orange-600`). Este color se usa en el botón de "Pagar", "Iniciar Sesión" y acentos principales.
    *   **Background (Light Mode)**: Fondos generales en `bg-gray-50` o `bg-stone-50`. Tarjetas (Cards) en `bg-white`.
    *   **Background (Dark Mode)**: Fondos generales en `bg-stone-900` o `bg-gray-900`. Tarjetas (Cards) en `bg-stone-800` o `bg-gray-800`.
    *   **Texto**: `text-gray-900` (Light) y `text-white` o `text-gray-100` (Dark). Texto secundario en `text-gray-500` (Light) y `text-gray-400` (Dark).
    *   **Alertas Semánticas**: Rojo para peligro/cancelar/SIN ingredientes (`text-red-500`, `bg-red-50`). Verde para éxito/EXTRA ingredientes (`text-green-500`, `bg-green-50`).
*   **Tipografía y Espaciados**:
    *   **Fuente**: Inter, Roboto o sistema sans-serif.
    *   **Sombras (Elevación)**: Tarjetas flotantes y modales usan `shadow-lg` o `shadow-xl`. Componentes clickeables usan `shadow-sm`.
    *   **Bordes**: `rounded-xl` o `rounded-2xl` para tarjetas y modales. `rounded-lg` para botones y inputs.

### 17.2 Patrones de Componentes (Estructura DOM)

Cuando la IA genere código, debe usar estos patrones repetibles:

*   **Inputs (Campos de texto)**: 
    *   Estructura: Un `div` contenedor con `relative`. Un icono de Lucide-react (ej. `Mail`, `Lock`) posicionado absoluto a la izquierda (`absolute left-3 top-1/2 -translate-y-1/2`). El input real debe tener `pl-10` (padding izquierdo) para no pisar el icono.
    *   Estados: `focus:ring-2 focus:ring-orange-500 focus:border-transparent`.
*   **Tarjetas de Producto (Client Catalog)**:
    *   Estructura: `div` con `flex flex-col`, `bg-white rounded-2xl shadow-sm overflow-hidden`.
    *   Top: `img` con `w-full h-48 object-cover`.
    *   Bottom: `div` con padding `p-4`. Título `h3 font-bold`, descripción truncada `text-sm text-gray-500 line-clamp-2`.
    *   Footer de tarjeta: `flex justify-between items-center mt-4`. Precio en fuente grande y un botón de "+" redondo.
*   **Comanda Kanban (KDS Cocina)**:
    *   Estructura: Tarjeta ancha `bg-stone-800 rounded-xl p-4 border-l-4 border-l-orange-500`.
    *   Header: ID gigante (`text-3xl font-black`) y un reloj (`text-sm font-mono`).
    *   Lista de items: `ul` con `li` que tengan `border-b border-stone-700 py-2`.
    *   Modificadores: Si el texto contiene "SIN", aplicar `<span className="text-red-400 font-bold">`. Si contiene "EXTRA", aplicar `<span className="text-green-400 font-bold">`.

### 17.3 Comportamiento Responsivo (Mobile vs Desktop)

*   **Módulo Cliente y Login**: Fluidos. En móvil (`w-full`), en pantallas grandes las tarjetas no deben estirarse infinitamente (usar `max-w-md` para Login, y un grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` para el catálogo).
*   **Módulo Administrador**: Desktop-First. Debe tener un sidebar lateral (`w-64 hidden md:block`) y un botón de hamburguesa (`md:hidden`) para pantallas pequeñas. El contenido a la derecha flex-grow.
*   **Módulo Cocina (KDS)**: Pensado para Tablets/Pantallas Horizontales (`min-w-[1024px]`). Las 3 columnas (Pendientes, Preparación, Listos) deben ser un grid de 3 columnas iguales (`grid-cols-3 gap-4`).
*   **Módulo Domiciliario**: Mobile-First puro. Elementos táctiles muy grandes (`min-h-[48px]`). Cero sidebars, navegación tipo barra inferior (Bottom Navigation) o solo barra superior simple.

### 17.4 Prompt Templates (Plantillas para pedirle a la IA)

*(Copia el siguiente texto y pégalo en una IA generativa junto con el resto de este manual para generar una vista perfecta):*

> **Prompt para el Login/Registro**:
> "Actúa como un experto en React y Tailwind CSS. Basándote en el manual de Hamburguer Copiway, genera el código del componente de la vista de 'Registro de Cliente'. Debe tener soporte para Modo Oscuro, usar la paleta Naranja corporativa, tener iconos a la izquierda en los inputs, incluir un Datepicker para el cumpleaños y tener un checkbox obligatorio para Habeas Data. No uses CSS personalizado, solo clases de Tailwind. Hazlo completamente responsive."

> **Prompt para el Tablero Kanban (KDS)**:
> "Genera el componente React + Tailwind para la vista KDS de Ayudante de Cocina de Hamburguer Copiway. Usa tema oscuro obligatorio (bg-stone-900). Crea un grid de 3 columnas (Pendientes, En Preparación, Listos). Diseña la tarjeta de la comanda con tipografía extra grande, resaltando dinámicamente en rojo intenso los ingredientes con prefijo 'SIN ' y en verde los 'EXTRA '. Incluye un botón de 'Imprimir Tirilla'."

> **Prompt para el Dashboard de Admin**:
> "Genera la vista del Dashboard de Administrador para Hamburguer Copiway. Necesito el Layout completo: un Sidebar lateral fijo (colapsable en móvil) y un área principal. En el área principal, incluye tarjetas de KPI (Ventas, Pedidos), y el botón estratégico de 'Cerrar Caja' resaltado, pero protegido visualmente. Usa Tailwind CSS y asegúrate de que cambie correctamente entre bg-gray-50 y bg-stone-900 según el modo."

---

## 18. DETALLE ESTRUCTURAL DE SUB-MÓDULOS (VISTAS REALES)

Para la creación de mockups precisos, el administrador y los roles cuentan con las siguientes vistas y sub-vistas implementadas:

### 18.1 Gestión de Equipo (Staff)
*   **Vista Principal**: Tabla con diseño "Clean" y bordes `rounded-3xl`.
*   **Columnas**: ID, Nombre, Rol (Badge estilizado), Estado (Pill con pulso: Activo/Inactivo).
*   **Botones**:
    *   **"Agregar Colaborador"**: Abre un formulario lateral o modal.
    *   **"Editar"** (Lápiz): Abre el formulario con datos cargados.
    *   **"Eliminar"** (Basura): Dispara diálogo de confirmación.
*   **Notificación**: `type: 'staff'` al realizar cambios.

### 18.2 Base de Datos de Clientes
*   **Layout**: Buscador superior integrado en el header del dashboard.
*   **Tabla**: Muestra Nombre, Teléfono, Puntos (Badge naranja) y Fecha de Nacimiento.
*   **Botón "Ver Perfil"**: Abre un resumen informativo del cliente.

### 18.3 Inventario y Abastecimiento Express
*   **Vista**: Grid de tarjetas de ingredientes.
*   **Elementos de cada tarjeta**: Nombre, stock actual, unidad de medida.
*   **Botón "+" (Abastecimiento Express)**: Incrementa rápidamente el stock (RF-32).
*   **Botón "Editar Receta"**: Permite vincular el ingrediente a productos.

### 18.4 Cierre de Caja y Reportes
*   **Layout**: Sección de "Reportes" con KPIs (Ventas totales, pedidos completados).
*   **Botón "Generar Cierre de Caja"**: Procesa los datos del turno actual.
*   **Acción Final**: Botón **"Descargar PDF"** (Genera el reporte oficial para contabilidad).
*   **Notificación**: `type: 'cierre'` al finalizar el proceso.

---

## 19. SISTEMA DE NOTIFICACIONES Y TOASTS (REALES)

El sistema utiliza el componente `ToastNotification` con los siguientes tipos de alertas visuales:

*   **`cart` (Naranja)**: Confirmación de productos añadidos al carrito.
*   **`success` (Verde)**: Éxito en pagos, registros y entregas.
*   **`whatsapp` (Verde)**: Al enviar notificaciones de salida a los clientes.
*   **`warning` (Amarillo)**: Avisos de cierre de sesión o acciones canceladas.
*   **`danger` (Rojo)**: Errores de validación, eliminación de datos o fallos de impresión.
*   **`inventory` (Naranja)**: Alertas de stock crítico o actualizaciones de ingredientes.
*   **`staff` (Azul)**: Cambios en el equipo de trabajo.
*   **`config` (Púrpura)**: Cambios en tarifa de envío, horario o sonidos.
*   **`cierre` (Verde Esmeralda)**: Confirmación de reportes generados.

---

## 20. BOTONES Y ACCIONES POR ROL (GUÍA DE INTERACCIÓN)

### 20.1 Administrador (AdminDashboard)
*   **Botón "Nuevo Pedido"**: Abre un modal con el formulario de pedido manual (RF-30).
*   **Botón "Editar Configuración"**: Permite cambiar la **Tarifa de Envío** y el **Horario de Atención**.
*   **Botón "Corregir Dirección"**: Disponible en pedidos activos; actualiza el destino en tiempo real.
*   **Switch de Horario**: Permite forzar el cierre del local manualmente.

### 20.2 Cliente (ClientDashboard)
*   **Botón "Personalizar"**: En cada producto, abre el **Creador Interactivo**.
*   **Botón "Pagar Ahora"**: Inicia el flujo de checkout (bloqueado fuera de horario).
*   **Botón "Repetir Pedido"**: En el historial, duplica exactamente la orden anterior (RF-08).
*   **Botón "Calificar"**: Visible solo en pedidos entregados para dejar reseñas (RF-16).

### 20.3 Cocina (KitchenDashboard)
*   **Botón "Marcar en Preparación"**: Mueve la tarjeta de la columna 'Pendientes' a 'En Preparación'.
*   **Botón "Listo para Despacho"**: Mueve la tarjeta a 'Listos' y notifica al domiciliario.
*   **Botón "Imprimir Sticker"**: Abre la vista previa del ticket/factura para impresión térmica (RF-40).
*   **Botón "Silenciar/Activar Alerta"**: Controla el timbre sonoro de nuevas comandas.

### 20.4 Domiciliario (DeliveryDashboard)
*   **Botón "Tomar Pedido"**: Asigna una orden lista a su ruta.
*   **Botón "En Camino"**: Actualiza el estado y habilita el botón de contacto.
*   **Botón "Contactar" (WhatsApp/Llamada)**: Visible **solo** durante el trayecto (RF-44).
*   **Botón "Entregado"**: Finaliza el pedido y lo archiva en el historial.

---

## 21. FLUJOS DE EXCEPCIÓN Y VALIDACIONES

### 21.1 Punto de No Retorno (Inquebrantable)
Una vez el cliente presiona "Pagar" y la transacción es exitosa, el sistema **oculta automáticamente** los botones de "Editar" o "Cancelar" en la vista del cliente. El pedido pasa a control de Cocina inmediatamente.

### 21.2 Alerta de SLA en Cocina
Si un pedido en la columna "En Preparación" supera los 15 minutos sin ser marcado como "Listo", el borde de la tarjeta cambia a **rojo vibrante** y muestra un aviso de tiempo excedido para priorizar la entrega.

### 21.3 Bloqueo de Stock en Tiempo Real
Si un ingrediente llega a stock 0 (agotado), el producto que lo contiene muestra un overlay de **"Agotado"** en el catálogo y el botón de añadir al carrito se desactiva instantáneamente para todos los clientes conectados.

---

## 22. GUÍA ESTRUCTURAL PARA MOCKUPS (PROMPTING UI)

### 22.1 Estilo de Tarjetas (Cards)
*   Usa `rounded-[32px]` para los contenedores principales.
*   Añade `border border-gray-100 dark:border-stone-800`.
*   Sombras suaves: `shadow-sm` o `shadow-[0_8px_30px_rgb(0,0,0,0.04)]`.

### 22.2 Tipografía
*   **Títulos**: Peso `font-black` (900) para impacto visual.
*   **Cuerpo**: Peso `font-medium` o `font-bold` para legibilidad.
*   **IDs de Pedido**: Fuente monoespaciada (`font-mono`) en negrita.

### 22.3 Feedback de Personalización (KDS)
*   Los ingredientes eliminados ("SIN") deben aparecer en **Texto Rojo negrita**.
*   Los ingredientes extras ("EXTRA") deben aparecer en **Texto Verde/Esmeralda negrita**.

---

## 23. CRONOLOGÍA DEL PEDIDO (PASO A PASO VISUAL)

1.  **Dashboard Cliente**: Explora el menú con transiciones de opacidad suave.
2.  **Creador Interactivo**: Capas visuales que se activan/desactivan al tocar.
3.  **Carrito Flotante**: Resumen lateral con recálculo de total en tiempo real.
4.  **KDS (Cocina)**: Kanban dinámico donde las tarjetas se "deslizan" entre columnas.
5.  **Mapa Domiciliario**: Interfaz móvil con pines de ubicación y botones táctiles de gran tamaño.
6.  **Reseña Final**: Modal de 5 estrellas que aparece al cerrar el ciclo de entrega.

---

## 24. VISTA DE BIENVENIDA (LANDING PAGE - ESTRUCTURA REAL)

Para el mockup de la página de inicio (antes de loguearse), se deben incluir estas secciones:

### 24.1 Hero Principal (Impacto Visual)
*   **Fondo**: Imagen de hamburguesa artesanal en alta resolución con un overlay degradado oscuro para legibilidad del texto.
*   **Titular**: "Las Mejores Hamburguesas de la Ciudad" con tipografía de 4.5rem y acentos en naranja gradiente.
*   **Botones**: "Hacer Pedido" (Naranja sólido) y "Ver Menú" (Borde blanco translúcido).

### 24.2 Secciones de Valor y Catálogo
*   **Barra de Valores**: Cuatro tarjetas con iconos de `Clock`, `Flame`, `Utensils` y `ShieldCheck` detallando la rapidez y frescura.
*   **Preview del Menú**: Un grid simplificado de productos con pestañas de categorías para que el usuario explore antes de registrarse.
*   **Historia y Cifras**: Sección con grid de fotos (estilo bento) y métricas clave (ej: +10K Pedidos Entregados).
*   **Testimonios**: Carrusel o grid de reseñas con estrellas y nombres de clientes reales.
*   **Contacto y Mapa**: Formulario de contacto integrado y un **Mapa Interactivo (Leaflet)** que muestra la ubicación de la Dark Kitchen.

---

## 25. ESTADOS VACÍOS Y DE ERROR (REAL UI STATES)

El sistema maneja visualmente la ausencia de datos para evitar pantallas en blanco:

*   **Búsqueda sin resultados**: "No se encontraron productos en esta categoría" con icono de búsqueda fallida.
*   **Sin Pedidos Activos**: "No tienes pedidos en curso en este momento" con un botón de acceso rápido al menú.
*   **Historial Vacío**: "Aún no has realizado pedidos" con una invitación a realizar la primera compra.
*   **Inventario Agotado**: Tarjeta de producto con opacidad al 50%, overlay de texto "AGOTADO" y botón de compra deshabilitado.

---

## 26. SISTEMA DE ALERTAS SONORAS Y NOTIFICACIONES (LÓGICA REAL)

*   **Timbre de Cocina**: Al entrar un nuevo pedido pagado, el KDS emite un sonido de "Ding" o "Alerta de campana". El ayudante puede silenciarlo con un botón de `VolumeX` si es necesario.
*   **Notificación de WhatsApp**: Al marcar "En Camino", el sistema abre una nueva ventana o enlace directo a `https://wa.me/` con un mensaje pre-configurado: *"¡Hola! Tu pedido de Hamburguer Copiway ya va en camino con nuestro domiciliario..."*.
*   **Alertas de Cierre**: Si el cliente intenta pagar faltando 5 minutos para el cierre, el sistema muestra un Toast de advertencia: *"El local está a punto de cerrar, apresura tu pedido"*.

---

## 27. EL MOTOR DE DATOS: FUNCIONAMIENTO Y ROL EN EL SISTEMA
La base de datos no es solo un almacén de información, es el sistema nervioso central de Hamburguer Copiway que garantiza:
*   **Sincronización Omnicanal**: Permite que una acción en la aplicación del cocinero (marcar como "Listo") se refleje instantáneamente en el celular del domiciliario y en la pantalla del cliente, coordinando a todo el equipo sin necesidad de comunicación verbal.
*   **Integridad de la Operación**: Asegura que el stock se descuente en el momento exacto del pago, evitando que dos personas compren el mismo ingrediente si solo queda una unidad (validación de concurrencia).
*   **Memoria de Negocio**: Protege cada registro de venta, cada punto de fidelidad y cada ajuste de inventario, permitiendo que el administrador pueda auditar la operación y tomar decisiones basadas en datos reales.
*   **Disponibilidad Continua**: Al ser un sistema gestionado en la nube, la información es accesible desde cualquier lugar y está protegida contra fallos físicos del hardware local, garantizando que el negocio nunca pierda su historial operativo.

---
**Hamburguer Copiway — Sistema Integrado de Gestión Operativa.**





