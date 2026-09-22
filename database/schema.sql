-- ======================================================
-- CopiwayPRO — Esquema MySQL (Laragon)
-- Migración desde Firebase/Firestore a PHP MVC + MySQL
-- Basado en el borrador hamburguer_copiway.sql, ajustado para:
--   - reflejar exactamente las decisiones de negocio del propietario
--   - servir de fuente de verdad para la API PHP (Fase 4)
-- Motor InnoDB, utf8mb4 en toda la base.
-- ======================================================

DROP DATABASE IF EXISTS hamburguer_copiway;
CREATE DATABASE hamburguer_copiway CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hamburguer_copiway;

SET default_storage_engine = InnoDB;


-- ======================================================
-- PASO 1: Configuración global y categorías
-- ======================================================
CREATE TABLE CONFIGURACION_SISTEMA (
    id_config                    CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    horario_apertura             TIME         NOT NULL DEFAULT '11:00:00',
    horario_cierre               TIME         NOT NULL DEFAULT '22:00:00',
    tarifa_plana_domicilio       DECIMAL(10,2) NOT NULL DEFAULT 0,
    margen_ganancia_defecto      DECIMAL(5,2)  NOT NULL DEFAULT 30,
    tienda_abierta_manual        BOOLEAN      NOT NULL DEFAULT TRUE,   -- override manual (storeConfig.isOpen)
    pausa_emergencia_activa      BOOLEAN      NOT NULL DEFAULT FALSE,  -- storeConfig.isPaused
    umbral_stock_critico_default DECIMAL(10,2) NOT NULL DEFAULT 10,
    -- Extensión propuesta (requiere aprobación): permite al admin señalar qué insumo representa
    -- la "bolsa de empaque global" que hoy useStore.addOrder descuenta por nombre parcial.
    -- Si se rechaza, se puede seguir emparejando por nombre como hace el frontend hoy.
    id_ingrediente_bolsa_global  CHAR(36)     NULL,
    creado_en                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE CATEGORIA (
    id_categoria CHAR(36)    NOT NULL DEFAULT '' PRIMARY KEY,
    nombre       VARCHAR(80) NOT NULL,
    ambito       ENUM('menu','insumo_alimenticio','empaque_desechable') NOT NULL,
    UNIQUE (nombre, ambito)
);


-- ======================================================
-- PASO 2: Cuentas de usuario (los 5 roles: Programador, Admin, Cocina, Domiciliario, Cliente)
-- ======================================================
CREATE TABLE ADMINISTRADOR (
    id_admin     CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    nombre       VARCHAR(120) NOT NULL,
    correo       VARCHAR(150) NOT NULL UNIQUE,
    telefono     VARCHAR(20)  NOT NULL UNIQUE,
    contrasena   VARCHAR(255) NOT NULL,          -- password_hash()
    nivel_acceso ENUM('programador','maestro') NOT NULL DEFAULT 'maestro',
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_por   CHAR(36)     NULL,              -- el Programador que creó al Admin (NULL = creado por seeder/CLI)
    creado_en    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES ADMINISTRADOR(id_admin)
);

CREATE TABLE AYUDANTE_COCINA (
    id_ayudante CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    correo      VARCHAR(150) NOT NULL UNIQUE,
    telefono    VARCHAR(20)  NOT NULL UNIQUE,
    contrasena  VARCHAR(255) NOT NULL,
    turno       ENUM('manana','tarde','noche','mixto') NOT NULL DEFAULT 'mixto',
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,      -- soft delete (regla 10)
    creado_por  CHAR(36)     NOT NULL,
    creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES ADMINISTRADOR(id_admin)
);

CREATE TABLE DOMICILIARIO (
    id_domiciliario        CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    nombre                 VARCHAR(120) NOT NULL,
    correo                 VARCHAR(150) NOT NULL UNIQUE,
    telefono               VARCHAR(20)  NOT NULL UNIQUE,
    contrasena             VARCHAR(255) NOT NULL,
    tipo_vehiculo          ENUM('moto','bicicleta','carro','a_pie') NOT NULL DEFAULT 'moto',
    placa                  VARCHAR(15),
    base_efectivo_asignada DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado_disponibilidad  ENUM('disponible','en_ruta','desconectado') NOT NULL DEFAULT 'desconectado',
    activo                 BOOLEAN      NOT NULL DEFAULT TRUE,        -- soft delete (regla 10)
    ubicacion_lat          DECIMAL(10,7),
    ubicacion_lng          DECIMAL(10,7),
    ubicacion_actualizada  DATETIME     NULL,
    creado_por             CHAR(36)     NOT NULL,
    creado_en              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creado_por) REFERENCES ADMINISTRADOR(id_admin)
);

CREATE TABLE CLIENTE (
    id_cliente                   CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    nombre                       VARCHAR(120) NOT NULL,
    telefono                     VARCHAR(20)  NOT NULL UNIQUE,
    correo                       VARCHAR(150) NOT NULL UNIQUE,
    contrasena                   VARCHAR(255) NOT NULL,
    direccion                    VARCHAR(255),
    fecha_nacimiento             DATE         NOT NULL,
    puntos_fidelidad             INT          NOT NULL DEFAULT 0,
    total_gastado                DECIMAL(12,2) NOT NULL DEFAULT 0,   -- Client.totalSpent
    fecha_aceptacion_habeas_data DATETIME     NOT NULL,
    ip_aceptacion_habeas_data    VARCHAR(45)  NOT NULL,              -- soporta IPv6
    activo                       BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Centro de notificaciones del cliente (Client.notifications[] en el frontend).
-- Distinta de NOTIFICACION (envíos externos por pedido: whatsapp/sms/push/email).
CREATE TABLE CLIENTE_NOTIFICACION (
    id_notificacion_cliente CHAR(36)    NOT NULL DEFAULT '' PRIMARY KEY,
    id_cliente              CHAR(36)    NOT NULL,
    titulo                  VARCHAR(150) NOT NULL,
    mensaje                 VARCHAR(500) NOT NULL,
    tipo                    ENUM('order','promo','system') NOT NULL DEFAULT 'system',
    leida                   BOOLEAN     NOT NULL DEFAULT FALSE,
    fecha                   DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente) ON DELETE CASCADE
);

CREATE TABLE CODIGO_VERIFICACION (
    id_codigo        CHAR(36)    NOT NULL DEFAULT '' PRIMARY KEY,
    id_cliente       CHAR(36)    NOT NULL,
    codigo_hash       VARCHAR(255) NOT NULL,   -- token de un solo uso, se guarda hasheado
    canal_envio      ENUM('email','sms','whatsapp') NOT NULL DEFAULT 'email',
    fecha_generacion DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion DATETIME    NOT NULL,
    usado            BOOLEAN     NOT NULL DEFAULT FALSE,
    intentos         TINYINT     NOT NULL DEFAULT 0,  -- intentos fallidos de verificacion; se invalida al llegar a 5
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente) ON DELETE CASCADE
);

-- Rate limiting de login (RateLimitMiddleware) — no requiere tabla de sesiones porque
-- se usan sesiones nativas de PHP (archivos), suficiente para el volumen de una dark kitchen.
CREATE TABLE INTENTO_LOGIN (
    id_intento CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    identificador VARCHAR(150) NOT NULL,   -- correo o teléfono intentado
    ip            VARCHAR(45)  NOT NULL,
    exitoso       BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_hora    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_intento_identificador (identificador, fecha_hora),
    INDEX idx_intento_ip (ip, fecha_hora)
);


-- ======================================================
-- PASO 3: Menú e inventario
-- ======================================================
CREATE TABLE PRODUCTO (
    id_producto        CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    id_categoria       CHAR(36)     NOT NULL,
    nombre             VARCHAR(120) NOT NULL,
    descripcion        VARCHAR(500),
    precio             DECIMAL(10,2) NOT NULL,
    costo_calculado    DECIMAL(10,2) NULL,      -- Product.costPrice, recalculado y guardado por el admin
    imagen             VARCHAR(255),
    tiempo_preparacion INT NULL,                -- Product.prepTime (minutos)
    estado             ENUM('activo','oculto') NOT NULL DEFAULT 'activo',
    etiqueta_destacada ENUM('ninguna','mas_vendido','recomendado','nuevo','especialidad') NOT NULL DEFAULT 'ninguna',
    creado_en          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria)
);

CREATE TABLE INGREDIENTE (
    id_ingrediente CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    id_categoria   CHAR(36)     NOT NULL,
    nombre         VARCHAR(120) NOT NULL,
    unidad_medida  VARCHAR(20)  NOT NULL DEFAULT 'unidad',
    cantidad_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    umbral_minimo  DECIMAL(12,2) NOT NULL DEFAULT 10,
    costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
    costo_total    DECIMAL(12,2) NULL,          -- InventoryItem.totalCost (opcional, informativo)
    precio_extra   DECIMAL(10,2) NOT NULL DEFAULT 0,
    proveedor      VARCHAR(150),
    notas          VARCHAR(500),
    creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES CATEGORIA(id_categoria)
);

ALTER TABLE CONFIGURACION_SISTEMA
    ADD FOREIGN KEY (id_ingrediente_bolsa_global) REFERENCES INGREDIENTE(id_ingrediente);

-- product_ingredients + product_packaging unificados: CATEGORIA.ambito distingue
-- insumo_alimenticio (ingrediente) de empaque_desechable (packaging).
CREATE TABLE RECETA (
    id_receta          CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_producto        CHAR(36) NOT NULL,
    id_ingrediente     CHAR(36) NOT NULL,
    cantidad_necesaria DECIMAL(12,4) NOT NULL DEFAULT 1,  -- quantityDeduct
    UNIQUE (id_producto, id_ingrediente),
    FOREIGN KEY (id_producto) REFERENCES PRODUCTO(id_producto) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente)
);


-- ======================================================
-- PASO 4: Caja (cierre persistido — hoy es efímero/aleatorio en el frontend)
-- ======================================================
CREATE TABLE REPORTE_CAJA (
    id_reporte     CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_admin       CHAR(36) NOT NULL,
    fecha          DATE     NOT NULL,
    total_ventas   DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_efectivo DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_digital  DECIMAL(12,2) NOT NULL DEFAULT 0,
    generado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_admin, fecha),
    FOREIGN KEY (id_admin) REFERENCES ADMINISTRADOR(id_admin)
);


-- ======================================================
-- PASO 5: Pedidos
-- ======================================================
CREATE TABLE PEDIDO (
    id_pedido            CHAR(36)     NOT NULL DEFAULT '' PRIMARY KEY,
    numero_pedido        INT          NOT NULL AUTO_INCREMENT UNIQUE, -- compone el id visible '#ORD-<numero_pedido>'
    id_cliente           CHAR(36)     NOT NULL,
    id_domiciliario      CHAR(36)     NULL,
    id_ayudante          CHAR(36)     NULL,
    id_reporte           CHAR(36)     NULL,       -- se asigna al archivar en el cierre de caja (regla 11)
    direccion_entrega    VARCHAR(255) NOT NULL,
    destino_lat          DECIMAL(10,7),
    destino_lng          DECIMAL(10,7),
    fecha_hora           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado               ENUM('pendiente','en_preparacion','listo','en_camino','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    canal_origen         ENUM('web','whatsapp','llamada') NOT NULL DEFAULT 'web',
    metodo_pago          ENUM('digital','efectivo') NOT NULL,
    estado_pago          ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
    fecha_pago           DATETIME     NULL,
    comprobante_pago     VARCHAR(255) NULL,
    pin_entrega          CHAR(4)      NOT NULL DEFAULT '',
    subtotal             DECIMAL(10,2) NOT NULL DEFAULT 0,
    costo_domicilio      DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento_cumpleanos DECIMAL(10,2) NOT NULL DEFAULT 0,
    puntos_ganados       INT          NOT NULL DEFAULT 0,
    total                DECIMAL(10,2) NOT NULL DEFAULT 0,
    creado_en            DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES CLIENTE(id_cliente),
    FOREIGN KEY (id_domiciliario) REFERENCES DOMICILIARIO(id_domiciliario),
    FOREIGN KEY (id_ayudante) REFERENCES AYUDANTE_COCINA(id_ayudante),
    FOREIGN KEY (id_reporte) REFERENCES REPORTE_CAJA(id_reporte),
    INDEX idx_pedido_estado (estado),
    INDEX idx_pedido_fecha (fecha_hora)
);

CREATE TABLE DETALLE_PEDIDO (
    id_detalle      CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_pedido       CHAR(36) NOT NULL,
    id_producto     CHAR(36) NOT NULL,
    nombre_producto VARCHAR(120) NOT NULL,   -- snapshot del nombre al momento de compra
    cantidad        INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,  -- precio congelado (regla 6)
    es_personalizado BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES PRODUCTO(id_producto)
);

CREATE TABLE PERSONALIZACION (
    id_personalizacion  CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_detalle          CHAR(36) NOT NULL,
    id_ingrediente      CHAR(36) NOT NULL,
    nombre_ingrediente  VARCHAR(120) NOT NULL,  -- snapshot
    accion_modificacion ENUM('quitar','agregar') NOT NULL,
    cantidad             DECIMAL(12,4) NOT NULL DEFAULT 1,
    costo_aplicado      DECIMAL(10,2) NOT NULL DEFAULT 0,
    FOREIGN KEY (id_detalle) REFERENCES DETALLE_PEDIDO(id_detalle) ON DELETE CASCADE,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente)
);

CREATE TABLE NOTIFICACION (
    id_notificacion CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_pedido       CHAR(36) NOT NULL,
    tipo            ENUM('whatsapp','sms','push','email') NOT NULL,
    mensaje         VARCHAR(500) NOT NULL,
    estado_envio    ENUM('pendiente','enviado','fallido') NOT NULL DEFAULT 'pendiente',
    fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE
);

CREATE TABLE RESENA (
    id_resena  CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_pedido  CHAR(36) NOT NULL UNIQUE,
    puntaje    TINYINT  NOT NULL,
    comentario VARCHAR(500),
    fecha      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE CASCADE
);


-- ======================================================
-- PASO 6: Inventario y auditoría
-- ======================================================
CREATE TABLE MOVIMIENTO_INVENTARIO (
    id_movimiento   CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_ingrediente  CHAR(36) NOT NULL,
    id_admin        CHAR(36) NULL,
    id_pedido       CHAR(36) NULL,     -- referencia opcional al pedido que originó el movimiento
    tipo_movimiento ENUM('entrada','salida','ajuste') NOT NULL,
    cantidad        DECIMAL(12,2) NOT NULL,
    motivo          VARCHAR(255) NOT NULL,
    fecha_hora      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ingrediente) REFERENCES INGREDIENTE(id_ingrediente),
    FOREIGN KEY (id_admin) REFERENCES ADMINISTRADOR(id_admin),
    FOREIGN KEY (id_pedido) REFERENCES PEDIDO(id_pedido) ON DELETE SET NULL,
    INDEX idx_movimiento_fecha (fecha_hora)
);

CREATE TABLE DETALLE_AUDITORIA (
    id_auditoria   CHAR(36) NOT NULL DEFAULT '' PRIMARY KEY,
    id_reporte     CHAR(36) NOT NULL,
    id_ingrediente CHAR(36) NOT NULL,
    nombre         VARCHAR(120) NOT NULL,
    stock_teorico  DECIMAL(12,2) NOT NULL,  -- calculado a partir de RECETA + DETALLE_PEDIDO
    stock_real     DECIMAL(12,2) NOT NULL,  -- stock actual en INGREDIENTE al momento del cierre
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
-- PASO 7: Automatismos
-- ======================================================

-- Genera el UUID automáticamente en cada tabla al insertar sin id
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

CREATE TRIGGER trg_id_cliente_notif BEFORE INSERT ON CLIENTE_NOTIFICACION FOR EACH ROW
BEGIN IF NEW.id_notificacion_cliente = '' THEN SET NEW.id_notificacion_cliente = UUID(); END IF; END$$

CREATE TRIGGER trg_id_codigo BEFORE INSERT ON CODIGO_VERIFICACION FOR EACH ROW
BEGIN IF NEW.id_codigo = '' THEN SET NEW.id_codigo = UUID(); END IF; END$$

CREATE TRIGGER trg_id_intento BEFORE INSERT ON INTENTO_LOGIN FOR EACH ROW
BEGIN IF NEW.id_intento = '' THEN SET NEW.id_intento = UUID(); END IF; END$$

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

-- Genera el UUID y el PIN de entrega de 4 dígitos automáticamente en cada pedido nuevo.
-- El descuento de inventario y la suma de puntos NO se hacen aquí: se ejecutan en
-- PHP (Services/InventoryService, Services/OrderService) dentro de UNA transacción con
-- SELECT ... FOR UPDATE, para poder rechazar la venta con un mensaje claro si no hay stock
-- (regla 12) — un trigger no puede hacer eso de forma controlada desde la API.
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

-- Fila única de configuración (settings/config en Firestore)
INSERT INTO CONFIGURACION_SISTEMA (id_config) VALUES ('');
