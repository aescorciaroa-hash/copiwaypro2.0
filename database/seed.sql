-- ======================================================
-- CopiwayPRO — Datos DEMO (opcional)
-- ======================================================
-- NO se ejecuta automáticamente en producción. Util solo para levantar un
-- entorno de desarrollo con datos de muestra. Los IDs son AUTO_INCREMENT
-- (ver schema.sql): nunca se especifican en los INSERT, MySQL los asigna.
--
-- Contraseñas de ejemplo (bcrypt, generadas con password_hash de PHP):
--   Staff/Admin  -> Copiway2024!
--   Clientes demo -> Cliente2024!
-- CAMBIAR estas contraseñas antes de usar en cualquier entorno real.
--
-- Ejecutar DESPUÉS de schema.sql:
--   mysql -u root hamburguer_copiway < database/seed.sql
-- ======================================================

USE hamburguer_copiway;

-- ------------------------------------------------------
-- Categorías (menú + insumos + empaques)
-- ------------------------------------------------------
INSERT INTO CATEGORIA (nombre, ambito) VALUES
('Hamburguesas de Pan', 'menu'),
('Hamburguesas de Patacón', 'menu'),
('Perros Calientes', 'menu'),
('Mazorcadas', 'menu'),
('Salchipapas', 'menu'),
('Chorizos', 'menu'),
('Bebidas', 'menu'),
('Adiciones / Extras', 'menu'),
('Panadería', 'insumo_alimenticio'),
('Carnes', 'insumo_alimenticio'),
('Embutidos', 'insumo_alimenticio'),
('Lácteos', 'insumo_alimenticio'),
('Verduras', 'insumo_alimenticio'),
('Acompañamientos', 'insumo_alimenticio'),
('Empaques', 'empaque_desechable');

-- ------------------------------------------------------
-- Cuentas (Programador → Admin → Cocina/Domiciliario; clientes se auto-registran)
-- ------------------------------------------------------
INSERT INTO ADMINISTRADOR (nombre, correo, telefono, contrasena, nivel_acceso, creado_por) VALUES
('Programador CopiwayPRO', 'programador@copiway.com', '3000000001', '$2y$10$XMfnRYNAjaB9ZY109KynwOiFF6yN5Qw2XBmckuTiJ03ydp.6YH1Fe', 'programador', NULL);

SET @id_programador = LAST_INSERT_ID();

INSERT INTO ADMINISTRADOR (nombre, correo, telefono, contrasena, nivel_acceso, creado_por) VALUES
('Administrador Copiway', 'admin@copiway.com', '3000000002', '$2y$10$XMfnRYNAjaB9ZY109KynwOiFF6yN5Qw2XBmckuTiJ03ydp.6YH1Fe', 'maestro', @id_programador);

SET @id_admin = LAST_INSERT_ID();

INSERT INTO AYUDANTE_COCINA (nombre, correo, telefono, contrasena, turno, creado_por) VALUES
('Carlos Mendoza', 'carlos.mendoza@copiway.com', '3000000003', '$2y$10$XMfnRYNAjaB9ZY109KynwOiFF6yN5Qw2XBmckuTiJ03ydp.6YH1Fe', 'mixto', @id_admin);

INSERT INTO DOMICILIARIO (nombre, correo, telefono, contrasena, tipo_vehiculo, base_efectivo_asignada, creado_por) VALUES
('Valentina Rojas', 'valentina.rojas@copiway.com', '3000000004', '$2y$10$XMfnRYNAjaB9ZY109KynwOiFF6yN5Qw2XBmckuTiJ03ydp.6YH1Fe', 'moto', 50000, @id_admin);

INSERT INTO CLIENTE (nombre, telefono, correo, contrasena, direccion, fecha_nacimiento, puntos_fidelidad, total_gastado, fecha_aceptacion_habeas_data, ip_aceptacion_habeas_data) VALUES
('Juan Pérez', '3001234567', 'juan.perez@email.com', '$2y$10$vDpGup453WFWPqbdTvngeeLBotUdNq1pailvCb33N1/WbjXyxZ.KW', 'Cra 51B # 82-254, Apto 301', '1990-05-12', 150, 125000, NOW(), '127.0.0.1'),
('María Gómez', '3109876543', 'maria.gomez@email.com', '$2y$10$vDpGup453WFWPqbdTvngeeLBotUdNq1pailvCb33N1/WbjXyxZ.KW', 'Calle 84 # 46-20, Local 2', '1995-08-23', 40, 42000, NOW(), '127.0.0.1'),
('Carlos Díaz', '3151122334', 'carlos.diaz@email.com', '$2y$10$vDpGup453WFWPqbdTvngeeLBotUdNq1pailvCb33N1/WbjXyxZ.KW', 'Cra 43 # 70-12', '1988-11-02', 300, 210000, NOW(), '127.0.0.1');

-- ------------------------------------------------------
-- Insumos (fusión de 'inventory' + 'ingredients' de Firestore, de-duplicados por nombre)
-- ------------------------------------------------------
INSERT INTO INGREDIENTE (id_categoria, nombre, unidad_medida, cantidad_stock, umbral_minimo, costo_unitario, precio_extra, proveedor) VALUES
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Panadería'),        'Pan de Hamburguesa',    'Unidades', 100, 20, 1500, 1500, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Panadería'),        'Pan de Perro',          'Unidades', 100, 20, 1200, 1200, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Carnes'),           'Carne 120g',            'Unidades',  10, 10, 4000, 4000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Embutidos'),        'Salchicha',             'Unidades',  50, 15, 2500, 2500, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Carnes'),           'Tocineta',              'Porciones', 50, 15, 4000, 4000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Lácteos'),          'Queso Cheddar',         'Láminas',    0, 20, 3000, 3000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Verduras'),         'Lechuga',               'Porciones', 200, 30, 1000, 1000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Verduras'),         'Tomate',                'Rodajas',   200, 30, 1000, 1000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Verduras'),         'Cebolla',               'Porciones', 200, 30, 1000, 1000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Acompañamientos'),  'Papas a la Francesa',   'Porciones',  45, 15, 2000, 2000, NULL),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Empaques'),         'Bolsa de Empaque Delivery', 'Unidades', 500, 50, 300, 0, NULL);

-- Registra la bolsa de empaque global en la configuración del sistema
SET @id_bolsa = (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre = 'Bolsa de Empaque Delivery');
UPDATE CONFIGURACION_SISTEMA SET id_ingrediente_bolsa_global = @id_bolsa;

-- ------------------------------------------------------
-- Productos + receta
-- ------------------------------------------------------
INSERT INTO PRODUCTO (id_categoria, nombre, descripcion, precio, imagen, etiqueta_destacada) VALUES
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Hamburguesas de Pan' AND ambito='menu'), 'Hamburguesa Clásica Copiway', 'Pan, Carne 120g, Queso, Lechuga, Tomate, Salsas', 14000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=800', 'mas_vendido'),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Hamburguesas de Pan' AND ambito='menu'), 'Hamburguesa Tocineta', 'Pan, Carne 120g, Queso, Tocineta, Salsas', 17000, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&q=80&w=800', 'ninguna'),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Perros Calientes' AND ambito='menu'), 'Perro Caliente Sencillo', 'Pan, Salchicha, Queso, Cebolla, Salsas', 10000, 'https://images.unsplash.com/photo-1615719413546-198b25453f85?auto=format&fit=crop&q=80&w=800', 'ninguna'),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Hamburguesas de Pan' AND ambito='menu'), 'Hamburguesa Doble Carne', 'Pan, 2 Carnes 120g, Doble Queso, Tocineta', 22000, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=800', 'especialidad'),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Perros Calientes' AND ambito='menu'), 'Perro Caliente Suizo', 'Pan, Salchicha, Queso Suizo, Cebolla Caramelizada', 13000, 'https://images.unsplash.com/photo-1591814468924-caf88d1232e1?auto=format&fit=crop&q=80&w=800', 'ninguna'),
((SELECT id_categoria FROM CATEGORIA WHERE nombre='Salchipapas' AND ambito='menu'), 'Papas Fritas', 'Porción de papas a la francesa crujientes', 6000, 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&q=80&w=800', 'ninguna');

INSERT INTO RECETA (id_producto, id_ingrediente, cantidad_necesaria) VALUES
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Clásica Copiway'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Pan de Hamburguesa'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Clásica Copiway'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Carne 120g'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Clásica Copiway'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Lechuga'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Clásica Copiway'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Tomate'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Clásica Copiway'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Cebolla'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Tocineta'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Pan de Hamburguesa'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Tocineta'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Carne 120g'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Tocineta'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Tocineta'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Tocineta'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Queso Cheddar'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Sencillo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Pan de Perro'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Sencillo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Salchicha'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Sencillo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Cebolla'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Doble Carne'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Pan de Hamburguesa'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Doble Carne'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Carne 120g'), 2),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Doble Carne'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Queso Cheddar'), 2),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Doble Carne'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Tocineta'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Suizo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Pan de Perro'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Suizo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Salchicha'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Suizo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Queso Cheddar'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Perro Caliente Suizo'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Cebolla'), 1),
((SELECT id_producto FROM PRODUCTO WHERE nombre='Papas Fritas'), (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Papas a la Francesa'), 1);

-- Cada producto de menú también consume 1 bolsa de empaque (packaging)
INSERT INTO RECETA (id_producto, id_ingrediente, cantidad_necesaria)
SELECT p.id_producto, (SELECT id_ingrediente FROM INGREDIENTE WHERE nombre='Bolsa de Empaque Delivery'), 1
FROM PRODUCTO p;

-- ------------------------------------------------------
-- Pedidos de ejemplo (histórico, para ver el dashboard con datos)
-- ------------------------------------------------------
SET @cli1 = (SELECT id_cliente FROM CLIENTE WHERE correo='juan.perez@email.com');
SET @cli2 = (SELECT id_cliente FROM CLIENTE WHERE correo='maria.gomez@email.com');
SET @dom1 = (SELECT id_domiciliario FROM DOMICILIARIO WHERE correo='valentina.rojas@copiway.com');
SET @ayu1 = (SELECT id_ayudante FROM AYUDANTE_COCINA WHERE correo='carlos.mendoza@copiway.com');
SET @prod_clasica = (SELECT id_producto FROM PRODUCTO WHERE nombre='Hamburguesa Clásica Copiway');
SET @prod_papas = (SELECT id_producto FROM PRODUCTO WHERE nombre='Papas Fritas');

INSERT INTO PEDIDO (id_cliente, id_domiciliario, direccion_entrega, estado, metodo_pago, estado_pago, fecha_pago, subtotal, costo_domicilio, total, puntos_ganados) VALUES
(@cli1, @dom1, 'Cra 51B # 82-254, Apto 301', 'en_camino', 'digital', 'aprobado', NOW(), 30000, 5000, 35000, 35);
SET @ped1 = LAST_INSERT_ID();
INSERT INTO DETALLE_PEDIDO (id_pedido, id_producto, nombre_producto, cantidad, precio_unitario) VALUES
(@ped1, @prod_clasica, 'Hamburguesa Clásica Copiway', 2, 12000);

INSERT INTO PEDIDO (id_cliente, id_ayudante, direccion_entrega, estado, metodo_pago, estado_pago, subtotal, costo_domicilio, total) VALUES
(@cli2, @ayu1, 'Calle 84 # 46-20, Local 2', 'en_preparacion', 'efectivo', 'pendiente', 14000, 5000, 19000);
SET @ped2 = LAST_INSERT_ID();
INSERT INTO DETALLE_PEDIDO (id_pedido, id_producto, nombre_producto, cantidad, precio_unitario) VALUES
(@ped2, @prod_clasica, 'Hamburguesa Clásica Copiway', 1, 14000);

INSERT INTO PEDIDO (id_cliente, id_domiciliario, direccion_entrega, estado, metodo_pago, estado_pago, fecha_pago, fecha_hora, subtotal, costo_domicilio, total, puntos_ganados) VALUES
(@cli1, @dom1, 'Cra 51B # 82-254, Apto 301', 'entregado', 'digital', 'aprobado', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, 20000, 5000, 25000, 25);
SET @ped3 = LAST_INSERT_ID();
INSERT INTO DETALLE_PEDIDO (id_pedido, id_producto, nombre_producto, cantidad, precio_unitario) VALUES
(@ped3, @prod_clasica, 'Hamburguesa Clásica Copiway', 1, 14000),
(@ped3, @prod_papas, 'Papas Fritas', 1, 6000);
INSERT INTO RESENA (id_pedido, puntaje, comentario) VALUES
(@ped3, 5, 'Excelente sabor, llegó rápido.');
