-- Archivo: backend/database/schema.sql
CREATE DATABASE IF NOT EXISTS inventario_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE inventario_db;

-- Drop views and triggers first
DROP VIEW IF EXISTS vista_mapeos_completos;
DROP VIEW IF EXISTS vista_stock_almacen;
DROP VIEW IF EXISTS vista_productos_stock;
DROP TRIGGER IF EXISTS actualizar_stock_after_movimiento;

-- Drop tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS albaranes_items;
DROP TABLE IF EXISTS albaranes_proveedores;
DROP TABLE IF EXISTS facturas_detalle;
DROP TABLE IF EXISTS facturas;
DROP TABLE IF EXISTS ordenes_compra_detalle;
DROP TABLE IF EXISTS ordenes_compra;
DROP TABLE IF EXISTS movimientos_stock;
DROP TABLE IF EXISTS mapeos;
DROP TABLE IF EXISTS stock_almacen;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS proveedores;
DROP TABLE IF EXISTS almacenes;
DROP TABLE IF EXISTS reglas_normalizacion;
DROP TABLE IF EXISTS configuracion_hotel;
DROP TABLE IF EXISTS centro_coste;
DROP TABLE IF EXISTS tipo_iva;
DROP TABLE IF EXISTS cuenta_contable;
DROP TABLE IF EXISTS tipo_producto;
DROP TABLE IF EXISTS medidas;

-- Tabla de medidas/unidades
CREATE TABLE medidas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL COLLATE utf8mb4_unicode_ci,
    simbolo VARCHAR(10) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    tipo ENUM('peso', 'volumen', 'longitud', 'cantidad', 'area', 'otros') DEFAULT 'otros',
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de tipos de producto
CREATE TABLE tipo_producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de cuentas contables
CREATE TABLE cuenta_contable (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    nombre VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_codigo (codigo),
    INDEX idx_nombre (nombre)
);

-- Tabla de tipos de IVA
CREATE TABLE tipo_iva (
    id INT AUTO_INCREMENT PRIMARY KEY,
    porcentaje DECIMAL(5,2) NOT NULL UNIQUE,
    nombre VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_porcentaje (porcentaje)
);

-- Tabla de centros de coste
CREATE TABLE centro_coste (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de proveedores
CREATE TABLE proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    rif VARCHAR(50) COLLATE utf8mb4_unicode_ci,
    telefono VARCHAR(20) COLLATE utf8mb4_unicode_ci,
    email VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    direccion VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    ciudad VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    codigo_postal VARCHAR(20) COLLATE utf8mb4_unicode_ci,
    provincia VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    cuenta_contable_id INT NULL,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cuenta_contable_id) REFERENCES cuenta_contable(id) ON DELETE SET NULL,
    INDEX idx_nombre (nombre),
    INDEX idx_rif (rif),
    INDEX idx_cuenta_contable (cuenta_contable_id)
);

-- Tabla de almacenes/warehouses
CREATE TABLE almacenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL COLLATE utf8mb4_unicode_ci,
    ubicacion VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Tabla de productos (tu inventario común)
CREATE TABLE productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    codigo VARCHAR(50) UNIQUE COLLATE utf8mb4_unicode_ci,
    barcode VARCHAR(100) UNIQUE COLLATE utf8mb4_unicode_ci,
    categoria ENUM('alimentos', 'bebidas', 'limpieza', 'aseo', 'otros') DEFAULT 'otros',
    medida_simbolo VARCHAR(10) NOT NULL COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    precio_referencia DECIMAL(10,2) DEFAULT 0.00,
    stock_minimo DECIMAL(10,2) DEFAULT 0.00,
    tipo_producto_id INT NULL,
    cuenta_contable_id INT NULL,
    tipo_iva_id INT NULL,
    centro_coste_id INT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medida_simbolo) REFERENCES medidas(simbolo) ON UPDATE CASCADE,
    FOREIGN KEY (tipo_producto_id) REFERENCES tipo_producto(id) ON DELETE SET NULL,
    FOREIGN KEY (cuenta_contable_id) REFERENCES cuenta_contable(id) ON DELETE SET NULL,
    FOREIGN KEY (tipo_iva_id) REFERENCES tipo_iva(id) ON DELETE SET NULL,
    FOREIGN KEY (centro_coste_id) REFERENCES centro_coste(id) ON DELETE SET NULL,
    INDEX idx_nombre (nombre),
    INDEX idx_codigo (codigo),
    INDEX idx_barcode (barcode),
    INDEX idx_categoria (categoria),
    INDEX idx_tipo_producto (tipo_producto_id),
    INDEX idx_cuenta_contable (cuenta_contable_id),
    INDEX idx_tipo_iva (tipo_iva_id),
    INDEX idx_centro_coste (centro_coste_id)
);

-- Tabla de stock por almacén
CREATE TABLE stock_almacen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    almacen_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad DECIMAL(10,3) DEFAULT 0.000,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_stock (almacen_id, producto_id),
    INDEX idx_almacen (almacen_id),
    INDEX idx_producto (producto_id)
);

-- Tabla de mapeos (relación proveedor-producto)
CREATE TABLE mapeos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_proveedor VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    codigo_proveedor VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    factor_conversion DECIMAL(10,4) DEFAULT 1.0000,
    precio_ultima_compra DECIMAL(10,2) DEFAULT 0.00,
    fecha_ultima_compra DATE NULL,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    UNIQUE KEY unique_mapeo (proveedor_id, nombre_proveedor),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_producto (producto_id)
);

-- Tabla de movimientos de stock
CREATE TABLE movimientos_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    almacen_origen_id INT NULL,
    almacen_destino_id INT NULL,
    tipo_movimiento ENUM('entrada', 'salida', 'transferencia', 'ajuste') NOT NULL,
    cantidad DECIMAL(10,3) NOT NULL,
    precio_unitario DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    proveedor_id INT NULL,
    motivo VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    referencia VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    usuario VARCHAR(100) DEFAULT 'sistema' COLLATE utf8mb4_unicode_ci,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (almacen_origen_id) REFERENCES almacenes(id),
    FOREIGN KEY (almacen_destino_id) REFERENCES almacenes(id),
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    INDEX idx_producto (producto_id),
    INDEX idx_fecha (fecha_movimiento),
    INDEX idx_tipo (tipo_movimiento),
    INDEX idx_almacen_origen (almacen_origen_id),
    INDEX idx_almacen_destino (almacen_destino_id)
);

-- Tabla de órdenes de compra
CREATE TABLE ordenes_compra (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_orden VARCHAR(50) UNIQUE COLLATE utf8mb4_unicode_ci,
    proveedor_id INT NOT NULL,
    fecha_creacion DATE NOT NULL,
    fecha_envio DATE NULL,
    fecha_esperada_recepcion DATE NULL,
    estado ENUM('borrador', 'enviada', 'parcialmente_recibida', 'recibida', 'cancelada') DEFAULT 'borrador',
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    impuestos DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    usuario_creacion VARCHAR(100) DEFAULT 'sistema' COLLATE utf8mb4_unicode_ci,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_fecha (fecha_creacion),
    INDEX idx_estado (estado),
    INDEX idx_numero (numero_orden)
);

-- Tabla de detalles de órdenes de compra
CREATE TABLE ordenes_compra_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    orden_compra_id INT NOT NULL,
    mapeo_id INT NOT NULL,
    cantidad_solicitada DECIMAL(10,3) NOT NULL,
    cantidad_recibida DECIMAL(10,3) DEFAULT 0.000,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_solicitada * precio_unitario) STORED,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
    FOREIGN KEY (mapeo_id) REFERENCES mapeos(id),
    INDEX idx_orden (orden_compra_id),
    INDEX idx_mapeo (mapeo_id)
);

-- Tabla de facturas/recibos
CREATE TABLE facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(100) NOT NULL COLLATE utf8mb4_unicode_ci,
    proveedor_id INT NOT NULL,
    orden_compra_id INT NULL,
    fecha_emision DATE NOT NULL,
    fecha_recepcion DATE NULL,
    fecha_email DATE NULL,
    email_origen VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    archivo_adjunto VARCHAR(500) COLLATE utf8mb4_unicode_ci,
    subtotal DECIMAL(12,2) DEFAULT 0.00,
    impuestos DECIMAL(12,2) DEFAULT 0.00,
    total DECIMAL(12,2) DEFAULT 0.00,
    estado ENUM('recibida', 'procesando', 'verificada', 'discrepancias', 'aprobada') DEFAULT 'recibida',
    notas TEXT COLLATE utf8mb4_unicode_ci,
    usuario_procesamiento VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_fecha (fecha_emision),
    INDEX idx_estado (estado),
    INDEX idx_numero (numero_factura),
    INDEX idx_orden (orden_compra_id)
);

-- Tabla de detalles de facturas
CREATE TABLE facturas_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factura_id INT NOT NULL,
    mapeo_id INT NOT NULL,
    cantidad DECIMAL(10,3) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
    cantidad_orden DECIMAL(10,3) DEFAULT 0.000,
    precio_orden DECIMAL(10,2) DEFAULT 0.00,
    discrepancia_cantidad BOOLEAN DEFAULT FALSE,
    discrepancia_precio BOOLEAN DEFAULT FALSE,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    FOREIGN KEY (mapeo_id) REFERENCES mapeos(id),
    INDEX idx_factura (factura_id),
    INDEX idx_mapeo (mapeo_id)
);

-- Tabla de albaranes/entregas de proveedores
CREATE TABLE albaranes_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero_albaran VARCHAR(100) NOT NULL COLLATE utf8mb4_unicode_ci,
    proveedor_id INT NOT NULL,
    orden_compra_id INT NULL,
    fecha_recepcion DATE NOT NULL,
    fecha_entrega DATE NULL,
    total_items INT DEFAULT 0,
    estado ENUM('recibido', 'procesando', 'procesado', 'completado') DEFAULT 'recibido',
    notas TEXT COLLATE utf8mb4_unicode_ci,
    usuario_procesamiento VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    fecha_procesamiento TIMESTAMP NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id),
    FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id),
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_fecha (fecha_recepcion),
    INDEX idx_estado (estado),
    INDEX idx_numero (numero_albaran),
    INDEX idx_orden (orden_compra_id)
);

-- Tabla de items de albaranes (datos crudos del proveedor)
CREATE TABLE albaranes_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    albaran_id INT NOT NULL,
    nombre_proveedor_crudo VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    codigo_proveedor_crudo VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    cantidad_cruda DECIMAL(10,3) NOT NULL,
    precio_unitario_crudo DECIMAL(10,2) NOT NULL,
    total_crudo DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_cruda * precio_unitario_crudo) STORED,
    nombre_normalizado VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    producto_id INT NULL,
    mapeo_id INT NULL,
    cantidad_final DECIMAL(10,3) NULL,
    precio_unitario_final DECIMAL(10,2) NULL,
    almacen_id INT NULL,
    estado ENUM('pendiente', 'matched', 'unmatched', 'manual_match') DEFAULT 'pendiente',
    confianza_match DECIMAL(3,2) DEFAULT 0.00,
    procesado BOOLEAN DEFAULT FALSE,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    FOREIGN KEY (albaran_id) REFERENCES albaranes_proveedores(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    FOREIGN KEY (mapeo_id) REFERENCES mapeos(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id),
    INDEX idx_albaran (albaran_id),
    INDEX idx_producto (producto_id),
    INDEX idx_mapeo (mapeo_id),
    INDEX idx_estado (estado),
    INDEX idx_procesado (procesado)
);

-- Tabla de reglas de normalización de nombres
CREATE TABLE reglas_normalizacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proveedor_id INT NULL,
    patron VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    reemplazo VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE,
    INDEX idx_proveedor (proveedor_id),
    INDEX idx_activo (activo)
);

-- Tabla de configuración del hotel
CREATE TABLE configuracion_hotel (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_legal VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    nombre_social VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    direccion TEXT COLLATE utf8mb4_unicode_ci,
    ciudad VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    codigo_postal VARCHAR(20) COLLATE utf8mb4_unicode_ci,
    nif VARCHAR(50) COLLATE utf8mb4_unicode_ci,
    telefono VARCHAR(20) COLLATE utf8mb4_unicode_ci,
    email_contacto VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre_legal (nombre_legal),
    INDEX idx_nif (nif)
);

-- Tabla de logs de email
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha_recepcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remitente VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    asunto VARCHAR(500) COLLATE utf8mb4_unicode_ci,
    archivo_adjunto VARCHAR(500) COLLATE utf8mb4_unicode_ci,
    procesado BOOLEAN DEFAULT FALSE,
    factura_id INT NULL,
    notas TEXT COLLATE utf8mb4_unicode_ci,
    FOREIGN KEY (factura_id) REFERENCES facturas(id),
    INDEX idx_fecha (fecha_recepcion),
    INDEX idx_procesado (procesado)
);

-- Insertar tipos de producto básicos
INSERT INTO tipo_producto (nombre, descripcion) VALUES
('Mercadería', 'Productos para reventa o consumo'),
('Servicio', 'Servicios prestados'),
('Inmovilizado', 'Bienes de larga duración'),
('Consumible', 'Materiales de consumo interno');

-- Insertar cuentas contables básicas
INSERT INTO cuenta_contable (codigo, nombre, descripcion) VALUES
('100000', 'CAJA', 'Cuenta de caja general'),
('110000', 'BANCOS', 'Cuentas bancarias'),
('200000', 'PROVEEDORES', 'Cuentas por pagar a proveedores'),
('300000', 'VENTAS', 'Ingresos por ventas'),
('400000', 'COMPRAS', 'Gastos de compras'),
('500000', 'GASTOS GENERALES', 'Gastos operativos generales'),
('600000', 'INVENTARIO', 'Valor del inventario');

-- Insertar tipos de IVA básicos
INSERT INTO tipo_iva (porcentaje, nombre, descripcion) VALUES
(0.00, 'Exento', 'Sin IVA'),
(10.00, 'Reducido', 'IVA reducido 10%'),
(21.00, 'General', 'IVA general 21%');

-- Insertar centros de coste básicos
INSERT INTO centro_coste (nombre, descripcion) VALUES
('Administración', 'Centro de costes administrativos'),
('Ventas', 'Centro de costes de ventas'),
('Producción', 'Centro de costes de producción'),
('Almacén', 'Centro de costes de almacén'),
('Hotel Principal', 'Centro de costes del hotel principal');

-- Insertar medidas básicas
INSERT INTO medidas (nombre, simbolo, tipo, descripcion) VALUES
('Kilogramos', 'kg', 'peso', 'Unidad de peso del Sistema Internacional'),
('Gramos', 'g', 'peso', 'Unidad de peso - submúltiplo del kilogramo'),
('Litros', 'l', 'volumen', 'Unidad de volumen del Sistema Internacional'),
('Mililitros', 'ml', 'volumen', 'Unidad de volumen - submúltiplo del litro'),
('Unidad', 'unidad', 'cantidad', 'Unidad individual de producto'),
('Caja', 'caja', 'cantidad', 'Empaque o contenedor de productos'),
('Paquete', 'paquete', 'cantidad', 'Agrupación de unidades'),
('Docena', 'docena', 'cantidad', '12 unidades'),
('Metros', 'm', 'longitud', 'Unidad de longitud del Sistema Internacional'),
('Centímetros', 'cm', 'longitud', 'Unidad de longitud - submúltiplo del metro');

-- Insertar almacén principal por defecto
INSERT INTO almacenes (nombre, ubicacion, descripcion) VALUES
('Almacén Principal', 'Hotel - Área de Recepción', 'Almacén principal del hotel');

-- Trigger para actualizar stock automáticamente
DELIMITER //
CREATE TRIGGER actualizar_stock_after_movimiento
    AFTER INSERT ON movimientos_stock
    FOR EACH ROW
BEGIN
    IF NEW.tipo_movimiento = 'entrada' THEN
        INSERT INTO stock_almacen (almacen_id, producto_id, cantidad)
        VALUES (COALESCE(NEW.almacen_destino_id, 1), NEW.producto_id, NEW.cantidad)
        ON DUPLICATE KEY UPDATE cantidad = cantidad + NEW.cantidad;
    ELSEIF NEW.tipo_movimiento = 'salida' THEN
        UPDATE stock_almacen
        SET cantidad = cantidad - NEW.cantidad
        WHERE almacen_id = COALESCE(NEW.almacen_origen_id, 1) AND producto_id = NEW.producto_id;
    ELSEIF NEW.tipo_movimiento = 'transferencia' THEN
        -- Salida del origen
        UPDATE stock_almacen
        SET cantidad = cantidad - NEW.cantidad
        WHERE almacen_id = NEW.almacen_origen_id AND producto_id = NEW.producto_id;
        -- Entrada al destino
        INSERT INTO stock_almacen (almacen_id, producto_id, cantidad)
        VALUES (NEW.almacen_destino_id, NEW.producto_id, NEW.cantidad)
        ON DUPLICATE KEY UPDATE cantidad = cantidad + NEW.cantidad;
    ELSEIF NEW.tipo_movimiento = 'ajuste' THEN
        UPDATE stock_almacen
        SET cantidad = NEW.cantidad
        WHERE almacen_id = COALESCE(NEW.almacen_destino_id, 1) AND producto_id = NEW.producto_id;
    END IF;
END//
DELIMITER ;

-- Vista para resumen de productos con stock total
CREATE VIEW vista_productos_stock AS
SELECT
    p.id,
    p.nombre,
    p.codigo,
    p.barcode,
    p.categoria,
    p.medida_simbolo,
    m.nombre as medida_nombre,
    p.descripcion,
    COALESCE(SUM(sa.cantidad), 0) as stock_actual,
    p.stock_minimo,
    p.precio_referencia,
    CASE
        WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo THEN 'BAJO'
        WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo * 1.5 THEN 'MEDIO'
        ELSE 'OK'
    END as estado_stock,
    p.tipo_producto_id,
    tp.nombre as tipo_producto_nombre,
    p.cuenta_contable_id,
    cc.nombre as cuenta_contable_nombre,
    cc.codigo as cuenta_contable_codigo,
    p.tipo_iva_id,
    ti.porcentaje as tipo_iva_porcentaje,
    ti.nombre as tipo_iva_nombre,
    p.centro_coste_id,
    cco.nombre as centro_coste_nombre,
    p.activo,
    p.fecha_registro
FROM productos p
JOIN medidas m ON p.medida_simbolo = m.simbolo
LEFT JOIN stock_almacen sa ON p.id = sa.producto_id
LEFT JOIN tipo_producto tp ON p.tipo_producto_id = tp.id
LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id
LEFT JOIN tipo_iva ti ON p.tipo_iva_id = ti.id
LEFT JOIN centro_coste cco ON p.centro_coste_id = cco.id
WHERE p.activo = TRUE
GROUP BY p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre, p.descripcion, p.stock_minimo, p.precio_referencia, p.tipo_producto_id, tp.nombre, p.cuenta_contable_id, cc.nombre, cc.codigo, p.tipo_iva_id, ti.porcentaje, ti.nombre, p.centro_coste_id, cco.nombre, p.activo, p.fecha_registro;

-- Vista para stock por almacén
CREATE VIEW vista_stock_almacen AS
SELECT
    sa.almacen_id,
    a.nombre as almacen_nombre,
    sa.producto_id,
    p.nombre as producto_nombre,
    p.codigo as producto_codigo,
    p.barcode,
    sa.cantidad,
    sa.fecha_actualizacion
FROM stock_almacen sa
JOIN almacenes a ON sa.almacen_id = a.id
JOIN productos p ON sa.producto_id = p.id
WHERE a.activo = TRUE AND p.activo = TRUE;

-- Vista para resumen de mapeos
CREATE VIEW vista_mapeos_completos AS
SELECT
    m.id,
    m.proveedor_id,
    pr.nombre as proveedor_nombre,
    m.producto_id,
    p.nombre as producto_nombre,
    p.codigo as producto_codigo,
    m.nombre_proveedor,
    m.codigo_proveedor,
    m.factor_conversion,
    m.precio_ultima_compra,
    m.fecha_ultima_compra,
    m.activo,
    m.fecha_registro
FROM mapeos m
JOIN proveedores pr ON m.proveedor_id = pr.id
JOIN productos p ON m.producto_id = p.id
WHERE m.activo = TRUE AND pr.activo = TRUE AND p.activo = TRUE;

-- Datos de ejemplo
INSERT INTO proveedores (nombre, rif, telefono, email, direccion) VALUES
('Distribuidora Central', 'J-12345678-0', '+58-212-1234567', 'ventas@distcentral.com', 'Av. Principal, Caracas'),
('Mayorista del Norte', 'J-87654321-0', '+58-414-7654321', 'pedidos@maynorte.com', 'Zona Industrial, Valencia');

INSERT INTO productos (nombre, codigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia, stock_minimo) VALUES
('Arroz Blanco Premium', 'ARR-001', '1234567890123', 'alimentos', 'kg', 'Arroz blanco de grano largo, primera calidad', 2.50, 50.00),
('Aceite de Cocina', 'ACE-001', '1234567890124', 'alimentos', 'l', 'Aceite vegetal para cocinar', 3.75, 20.00),
('Detergente en Polvo', 'DET-001', '1234567890125', 'limpieza', 'kg', 'Detergente en polvo para ropa', 4.20, 10.00);

INSERT INTO mapeos (proveedor_id, producto_id, nombre_proveedor, codigo_proveedor, factor_conversion, precio_ultima_compra) VALUES
(1, 1, 'Arroz Diana 1kg', 'DIANA-ARR1', 1.0000, 2.30),
(1, 2, 'Aceite Mazeite 1L', 'MAZE-ACE1L', 1.0000, 3.50),
(2, 1, 'Arroz Premium Norte 1000g', 'ARR-PN-1000', 1.0000, 2.40);

-- Inicializar stock en almacén principal
INSERT INTO stock_almacen (almacen_id, producto_id, cantidad) VALUES
(1, 1, 100.000),
(1, 2, 50.000),
(1, 3, 25.000);

-- Reglas de normalización de nombres por defecto
INSERT INTO reglas_normalizacion (patron, reemplazo, descripcion) VALUES
('kg\\b', '', 'Remover unidad kg'),
('g\\b', '', 'Remover unidad g'),
('l\\b', '', 'Remover unidad l'),
('ml\\b', '', 'Remover unidad ml'),
('unidad\\b', '', 'Remover palabra unidad'),
('unidades\\b', '', 'Remover palabra unidades'),
('caja\\b', '', 'Remover palabra caja'),
('cajas\\b', '', 'Remover palabra cajas'),
('paquete\\b', '', 'Remover palabra paquete'),
('paquetes\\b', '', 'Remover palabra paquetes'),
('docena\\b', '', 'Remover palabra docena'),
('docenas\\b', '', 'Remover palabra docenas'),
('\\s+', ' ', 'Normalizar espacios múltiples'),
('^\\s+|\\s+$', '', 'Remover espacios al inicio y final');

SELECT 'Base de datos actualizada exitosamente!' as mensaje;
