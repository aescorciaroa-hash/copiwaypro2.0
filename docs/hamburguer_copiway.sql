-- ======================================================
-- PASO 1: Crear la base de datos
-- ======================================================
DROP DATABASE IF EXISTS hamburguer_copiway;
CREATE DATABASE hamburguer_copiway CHARACTER SET utf8mb4;
USE hamburguer_copiway;


-- ======================================================
-- PASO 2: Configuracion y categorias
-- ======================================================
CREATE TABLE CONFIGURACION_SISTEMA (
    id_config                    CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    horario_apertura             TIME NOT NULL DEFAULT '11:00:00',
    horario_cierre               TIME NOT NULL DEFAULT '22:00:00',
    tarifa_plana_domicilio       DECIMAL(10,2) NOT NULL DEFAULT 0,
    margen_ganancia_defecto      DECIMAL(5,2) NOT NULL DEFAULT 30,
    pausa_emergencia_activa      BOOLEAN NOT NULL DEFAULT FALSE,
    umbral_stock_critico_default DECIMAL(10,2) NOT NULL DEFAULT 10,
    pin_estacion_kds             VARCHAR(20) NOT NULL,
    pin_estacion_domiciliario    VARCHAR(20) NOT NULL
);

CREATE TABLE CATEGORIA (
    id_categoria CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    nombre       VARCHAR(80) NOT NULL,
    ambito       ENUM('menu','insumo_alimenticio','empaque_desechable') NOT NULL
);


-- ======================================================
-- PASO 3: Cuentas de usuario (los 4 roles)
-- ======================================================
CREATE TABLE ADMINISTRADOR (
    id_admin     CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL,
    correo       VARCHAR(150) NOT NULL UNIQUE,
    telefono     VARCHAR(20) NOT NULL UNIQUE,
    contrasena   VARCHAR(255) NOT NULL,
    nivel_acceso ENUM('maestro') NOT NULL DEFAULT 'maestro'
);

CREATE TABLE AYUDANTE_COCINA (
    id_ayudante CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    correo      VARCHAR(150) NOT NULL UNIQUE,
    telefono    VARCHAR(20) NOT NULL UNIQUE,
    contrasena  VARCHAR(255) NOT NULL,
    turno       ENUM('manana','tarde','noche','mixto') NOT NULL DEFAULT 'mixto',
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    creado_por  CHAR(36) NOT NULL,
    FOREIGN KEY (creado_por) REFERENCES ADMINISTRADOR(id_admin)
);

CREATE TABLE DOMICILIARIO (
    id_domiciliario        CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    nombre                 VARCHAR(120) NOT NULL,
    correo                 VARCHAR(150) NOT NULL UNIQUE,
    telefono               VARCHAR(20) NOT NULL UNIQUE,
    contrasena             VARCHAR(255) NOT NULL,
    tipo_vehiculo          ENUM('moto','bicicleta','carro','a_pie') NOT NULL,
    placa                  VARCHAR(15),
    base_efectivo_asignada DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado_disponibilidad  ENUM('disponible','en_ruta','desconectado') NOT NULL DEFAULT 'desconectado',
    activo                 BOOLEAN NOT NULL DEFAULT TRUE,
    ubicacion_lat          DECIMAL(10,7),
    ubicacion_lng          DECIMAL(10,7),
    creado_por             CHAR(36) NOT NULL,
    FOREIGN KEY (creado_por) REFERENCES ADMINISTRADOR(id_admin)
);

CREATE TABLE CLIENTE (
    id_cliente                   CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    nombre                       VARCHAR(120) NOT NULL,
    telefono                     VARCHAR(20) NOT NULL UNIQUE,
    correo                       VARCHAR(150) NOT NULL UNIQUE,
    contrasena                   VARCHAR(255) NOT NULL,
    direccion                    VARCHAR(255),
    fecha_nacimiento             DATE NOT NULL,
    puntos_fidelidad             INT NOT NULL DEFAULT 0,
    fecha_aceptacion_habeas_data DATETIME NOT NULL
);

CREATE TABLE CODIGO_VERIFICACION (
    id_codigo        CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_cliente       CHAR(36) NOT NULL,
    codigo           VARCHAR(10) NOT NULL,
    canal_envio      ENUM('email','sms','whatsapp') NOT NULL,
    fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME NOT NULL,
    usado            BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente) ON DELETE CASCADE
);


-- ======================================================
-- PASO 4: Menu e inventario
-- ======================================================
CREATE TABLE PRODUCTO (
    id_producto        CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_categoria       CHAR(36) NOT NULL,
    nombre             VARCHAR(120) NOT NULL,
    descripcion        VARCHAR(500),
    precio             DECIMAL(10,2) NOT NULL,
    imagen             VARCHAR(255),
    estado             ENUM('activo','oculto') NOT NULL DEFAULT 'activo',
    etiqueta_destacada ENUM('ninguna','mas_vendido','recomendado','nuevo','especialidad') NOT NULL DEFAULT 'ninguna',
    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria)
);

CREATE TABLE INGREDIENTE (
    id_ingrediente CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_categoria   CHAR(36) NOT NULL,
    nombre         VARCHAR(120) NOT NULL,
    unidad_medida  VARCHAR(20) NOT NULL,
    cantidad_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    umbral_minimo  DECIMAL(12,2) NOT NULL DEFAULT 10,
    costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_extra   DECIMAL(10,2) NOT NULL DEFAULT 0,
    proveedor      VARCHAR(150),
    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria)
);

CREATE TABLE RECETA (
    id_receta          CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_producto        CHAR(36) NOT NULL,
    id_ingrediente     CHAR(36) NOT NULL,
    cantidad_necesaria DECIMAL(12,4) NOT NULL,
    UNIQUE (id_producto, id_ingrediente),
    FOREIGN KEY (id_producto) REFERENCES PRODUCTO(id_producto) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente)
);


-- ======================================================
-- PASO 5: Caja
-- ======================================================
CREATE TABLE REPORTE_CAJA (
    id_reporte     CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_admin       CHAR(36) NOT NULL,
    fecha          DATE NOT NULL,
    total_ventas   DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_digital  DECIMAL(12,2) NOT NULL DEFAULT 0,
    UNIQUE (id_admin, fecha),
    FOREIGN KEY (id_admin) REFERENCES ADMINISTRADOR(id_admin)
);


-- ======================================================
-- PASO 6: Pedidos
-- ======================================================
CREATE TABLE PEDIDO (
    id_pedido            CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_cliente           CHAR(36) NOT NULL,
    id_domiciliario      CHAR(36),
    id_ayudante          CHAR(36),
    id_reporte           CHAR(36),
    direccion_entrega    VARCHAR(255) NOT NULL,
    destino_lat          DECIMAL(10,7),
    destino_lng          DECIMAL(10,7),
    fecha_hora           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado               ENUM('pendiente','en_preparacion','listo','en_camino','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    canal_origen         ENUM('web','whatsapp','llamada') NOT NULL DEFAULT 'web',
    pin_entrega          CHAR(4) NOT NULL DEFAULT '',
    tirilla_impresa      BOOLEAN NOT NULL DEFAULT FALSE,
    subtotal             DECIMAL(10,2) NOT NULL DEFAULT 0,
    costo_domicilio      DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento_cumpleanos DECIMAL(10,2) NOT NULL DEFAULT 0,
    puntos_ganados       INT NOT NULL DEFAULT 0,
    total                DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente),
    FOREIGN KEY (id_domiciliario) REFERENCES DOMICILIARIO(id_domiciliario),
    FOREIGN KEY (id_ayudante) REFERENCES AYUDANTE_COCINA(id_ayudante),
    FOREIGN KEY (id_reporte) REFERENCES REPORTE_CAJA(id_reporte)
);

CREATE TABLE DETALLE_PEDIDO (
    id_detalle      CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_pedido       CHAR(36) NOT NULL,
    id_producto     CHAR(36) NOT NULL,
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES PRODUCTO(id_producto)
);

CREATE TABLE PERSONALIZACION (
    id_personalizacion  CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_detalle          CHAR(36) NOT NULL,
    id_ingrediente      CHAR(36) NOT NULL,
    accion_modificacion ENUM('quitar','agregar') NOT NULL,
    costo_aplicado      DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (id_detalle) REFERENCES DETALLE_PEDIDO(id_detalle) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente)
);

CREATE TABLE PAGO (
    id_pedido   CHAR(36) NOT NULL PRIMARY KEY,
    metodo      ENUM('digital','efectivo') NOT NULL,
    comprobante VARCHAR(255),
    estado      ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
    fecha_pago  DATETIME,
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE
);

CREATE TABLE NOTIFICACION (
    id_notificacion CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_pedido       CHAR(36) NOT NULL,
    tipo            ENUM('whatsapp','sms','push','email') NOT NULL,
    mensaje         VARCHAR(500) NOT NULL,
    estado_envio    ENUM('pendiente','enviado','fallido') NOT NULL DEFAULT 'pendiente',
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE
);

CREATE TABLE RESENA (
    id_resena  CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_pedido  CHAR(36) NOT NULL UNIQUE,
    puntaje    TINYINT NOT NULL,
    comentario VARCHAR(500),
    fecha      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE
);


-- ======================================================
-- PASO 7: Inventario y auditoria
-- ======================================================
CREATE TABLE MOVIMIENTO_INVENTARIO (
    id_movimiento   CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_ingrediente  CHAR(36) NOT NULL,
    id_admin        CHAR(36),
    tipo_movimiento ENUM('entrada','salida','ajuste') NOT NULL,
    cantidad        DECIMAL(12,2) NOT NULL,
    motivo          VARCHAR(255) NOT NULL,
    fecha_hora      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente),
    FOREIGN KEY (id_admin) REFERENCES ADMINISTRADOR(id_admin)
);

CREATE TABLE DETALLE_AUDITORIA (
    id_auditoria   CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_reporte     CHAR(36) NOT NULL,
    id_ingrediente CHAR(36) NOT NULL,
    nombre         VARCHAR(120) NOT NULL,
    stock_teorico  DECIMAL(12,2) NOT NULL,
    stock_real     DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (id_reporte) REFERENCES REPORTE_CAJA(id_reporte) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente)
);

CREATE TABLE LIQUIDACION_DOMICILIARIO (
    id_liquidacion       CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_reporte           CHAR(36) NOT NULL,
    id_domiciliario      CHAR(36) NOT NULL,
    base_asignada        DECIMAL(10,2) NOT NULL,
    efectivo_recolectado DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_liquidado   DECIMAL(10,2) NOT NULL DEFAULT 0,
    UNIQUE (id_reporte, id_domiciliario),
    FOREIGN KEY (id_reporte) REFERENCES REPORTE_CAJA(id_reporte) ON DELETE CASCADE,
    FOREIGN KEY (id_domiciliario) REFERENCES DOMICILIARIO(id_domiciliario)
);


-- ======================================================
-- PASO 8: Automatismos (pegar todo este bloque junto)
-- ======================================================

-- Genera el ID (UUID) automaticamente en cada tabla al insertar sin id
DELIMITER $$
CREATE TRIGGER trg_id_configuracion BEFORE INSERT ON CONFIGURACION_SISTEMA FOR EACH ROW
BEGIN IF NEW.id_config = '' THEN SET NEW.id_config = UUID(); END IF; END$$

CREATE TRIGGER trg_id_categoria BEFORE INSERT ON CATEGORIA FOR EACH ROW
BEGIN IF NEW.id_categoria = '' THEN SET NEW.id_categoria = UUID(); END IF; END$$

CREATE TRIGGER trg_id_admin BEFORE INSERT ON ADMINISTRADOR FOR EACH ROW
BEGIN IF NEW.id_admin = '' THEN SET NEW.id_admin = UUID(); END IF; END$$

CREATE TRIGGER trg_id_ayudante BEFORE INSERT ON AYUDANTE_COCINA FOR EACH ROW
BEGIN IF NEW.id_ayudante = '' THEN SET NEW.id_ayudante = UUID(); END IF; END$$

CREATE TRIGGER trg_id_domiciliario BEFORE INSERT ON DOMICILIARIO FOR EACH ROW
BEGIN IF NEW.id_domiciliario = '' THEN SET NEW.id_domiciliario = UUID(); END IF; END$$

CREATE TRIGGER trg_id_cliente BEFORE INSERT ON CLIENTE FOR EACH ROW
BEGIN IF NEW.id_cliente = '' THEN SET NEW.id_cliente = UUID(); END IF; END$$

CREATE TRIGGER trg_id_codigo BEFORE INSERT ON CODIGO_VERIFICACION FOR EACH ROW
BEGIN IF NEW.id_codigo = '' THEN SET NEW.id_codigo = UUID(); END IF; END$$

CREATE TRIGGER trg_id_producto BEFORE INSERT ON PRODUCTO FOR EACH ROW
BEGIN IF NEW.id_producto = '' THEN SET NEW.id_producto = UUID(); END IF; END$$

CREATE TRIGGER trg_id_ingrediente BEFORE INSERT ON INGREDIENTE FOR EACH ROW
BEGIN IF NEW.id_ingrediente = '' THEN SET NEW.id_ingrediente = UUID(); END IF; END$$

CREATE TRIGGER trg_id_receta BEFORE INSERT ON RECETA FOR EACH ROW
BEGIN IF NEW.id_receta = '' THEN SET NEW.id_receta = UUID(); END IF; END$$

CREATE TRIGGER trg_id_reporte BEFORE INSERT ON REPORTE_CAJA FOR EACH ROW
BEGIN IF NEW.id_reporte = '' THEN SET NEW.id_reporte = UUID(); END IF; END$$

CREATE TRIGGER trg_id_detalle BEFORE INSERT ON DETALLE_PEDIDO FOR EACH ROW
BEGIN IF NEW.id_detalle = '' THEN SET NEW.id_detalle = UUID(); END IF; END$$

CREATE TRIGGER trg_id_personalizacion BEFORE INSERT ON PERSONALIZACION FOR EACH ROW
BEGIN IF NEW.id_personalizacion = '' THEN SET NEW.id_personalizacion = UUID(); END IF; END$$

CREATE TRIGGER trg_id_notificacion BEFORE INSERT ON NOTIFICACION FOR EACH ROW
BEGIN IF NEW.id_notificacion = '' THEN SET NEW.id_notificacion = UUID(); END IF; END$$

CREATE TRIGGER trg_id_resena BEFORE INSERT ON RESENA FOR EACH ROW
BEGIN IF NEW.id_resena = '' THEN SET NEW.id_resena = UUID(); END IF; END$$

CREATE TRIGGER trg_id_movimiento BEFORE INSERT ON MOVIMIENTO_INVENTARIO FOR EACH ROW
BEGIN IF NEW.id_movimiento = '' THEN SET NEW.id_movimiento = UUID(); END IF; END$$

CREATE TRIGGER trg_id_auditoria BEFORE INSERT ON DETALLE_AUDITORIA FOR EACH ROW
BEGIN IF NEW.id_auditoria = '' THEN SET NEW.id_auditoria = UUID(); END IF; END$$

CREATE TRIGGER trg_id_liquidacion BEFORE INSERT ON LIQUIDACION_DOMICILIARIO FOR EACH ROW
BEGIN IF NEW.id_liquidacion = '' THEN SET NEW.id_liquidacion = UUID(); END IF; END$$
DELIMITER ;

-- Genera el ID y el PIN de 4 digitos automaticamente en cada pedido nuevo
DELIMITER $$
CREATE TRIGGER trg_pedido_pin
BEFORE INSERT ON PEDIDO
FOR EACH ROW
BEGIN
    IF NEW.id_pedido = '' THEN
        SET NEW.id_pedido = UUID();
    END IF;
    IF NEW.pin_entrega = '' THEN
        SET NEW.pin_entrega = LPAD(FLOOR(RAND()*10000), 4, '0');
    END IF;
END$$
DELIMITER ;

-- Cuando el pago pasa a "aprobado": descuenta inventario y suma puntos
DELIMITER $$
CREATE TRIGGER trg_pago_aprobado
BEFORE UPDATE ON PAGO
FOR EACH ROW
BEGIN
    IF NEW.estado = 'aprobado' AND OLD.estado <> 'aprobado' THEN

        INSERT INTO MOVIMIENTO_INVENTARIO (id_ingrediente, tipo_movimiento, cantidad, motivo)
        SELECT r.id_ingrediente, 'salida', r.cantidad_necesaria * dp.cantidad,
               CONCAT('Venta pedido ', NEW.id_pedido)
        FROM DETALLE_PEDIDO dp
        JOIN RECETA r ON r.id_producto = dp.id_producto
        WHERE dp.id_pedido = NEW.id_pedido
          AND NOT EXISTS (
              SELECT 1 FROM PERSONALIZACION p
              WHERE p.id_detalle = dp.id_detalle
                AND p.id_ingrediente = r.id_ingrediente
                AND p.accion_modificacion = 'quitar'
          );

        INSERT INTO MOVIMIENTO_INVENTARIO (id_ingrediente, tipo_movimiento, cantidad, motivo)
        SELECT p.id_ingrediente, 'salida', dp.cantidad, CONCAT('Extra pedido ', NEW.id_pedido)
        FROM PERSONALIZACION p
        JOIN DETALLE_PEDIDO dp ON dp.id_detalle = p.id_detalle
        WHERE dp.id_pedido = NEW.id_pedido AND p.accion_modificacion = 'agregar';

        UPDATE INGREDIENTE ing
        JOIN (
            SELECT id_ingrediente, SUM(cantidad) AS total
            FROM MOVIMIENTO_INVENTARIO
            WHERE motivo IN (CONCAT('Venta pedido ', NEW.id_pedido), CONCAT('Extra pedido ', NEW.id_pedido))
            GROUP BY id_ingrediente
        ) mv ON mv.id_ingrediente = ing.id_ingrediente
        SET ing.cantidad_stock = GREATEST(ing.cantidad_stock - mv.total, 0);

        UPDATE CLIENTE c
        JOIN PEDIDO ped ON ped.id_cliente = c.id_cliente
        SET c.puntos_fidelidad = c.puntos_fidelidad + FLOOR(ped.total / 1000)
        WHERE ped.id_pedido = NEW.id_pedido;

        UPDATE PEDIDO SET puntos_ganados = FLOOR(total/1000) WHERE id_pedido = NEW.id_pedido;

        SET NEW.fecha_pago = NOW();
    END IF;
END$$
DELIMITER ;
