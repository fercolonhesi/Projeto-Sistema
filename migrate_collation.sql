-- Script de migración para corregir problemas de collation en MySQL
-- Ejecutar este script en la base de datos existente para corregir el error:
-- "Illegal mix of collations (utf8mb4_0900_ai_ci,COERCIBLE) and (utf8mb4_unicode_ci,COERCIBLE)"

USE inventario_db;

-- Cambiar la collation de la base de datos
ALTER DATABASE inventario_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cambiar collation de todas las tablas
ALTER TABLE medidas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE proveedores CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE almacenes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE productos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE stock_almacen CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE mapeos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE movimientos_stock CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ordenes_compra CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ordenes_compra_detalle CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE albaranes_proveedores CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE albaranes_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE reglas_normalizacion CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE configuracion_hotel CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE facturas CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE facturas_detalle CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE email_logs CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Agregar campos contables a productos si no existen
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto_id INT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS cuenta_contable_id INT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_iva_id INT NULL;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS centro_coste_id INT NULL;

-- Agregar foreign keys si no existen
ALTER TABLE productos ADD CONSTRAINT IF NOT EXISTS fk_tipo_producto FOREIGN KEY (tipo_producto_id) REFERENCES tipo_producto(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT IF NOT EXISTS fk_cuenta_contable FOREIGN KEY (cuenta_contable_id) REFERENCES cuenta_contable(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT IF NOT EXISTS fk_tipo_iva FOREIGN KEY (tipo_iva_id) REFERENCES tipo_iva(id) ON DELETE SET NULL;
ALTER TABLE productos ADD CONSTRAINT IF NOT EXISTS fk_centro_coste FOREIGN KEY (centro_coste_id) REFERENCES centro_coste(id) ON DELETE SET NULL;

-- Crear tablas contables si no existen
CREATE TABLE IF NOT EXISTS tipo_producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

CREATE TABLE IF NOT EXISTS cuenta_contable (
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

CREATE TABLE IF NOT EXISTS tipo_iva (
    id INT AUTO_INCREMENT PRIMARY KEY,
    porcentaje DECIMAL(5,2) NOT NULL UNIQUE,
    nombre VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_porcentaje (porcentaje)
);

CREATE TABLE IF NOT EXISTS centro_coste (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    descripcion TEXT COLLATE utf8mb4_unicode_ci,
    activo BOOLEAN DEFAULT TRUE,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
);

-- Insertar datos básicos si no existen
INSERT IGNORE INTO tipo_producto (nombre, descripcion) VALUES
('Mercadería', 'Productos para reventa o consumo'),
('Servicio', 'Servicios prestados'),
('Inmovilizado', 'Bienes de larga duración'),
('Consumible', 'Materiales de consumo interno');

INSERT IGNORE INTO cuenta_contable (codigo, nombre, descripcion) VALUES
('100000', 'CAJA', 'Cuenta de caja general'),
('110000', 'BANCOS', 'Cuentas bancarias'),
('200000', 'PROVEEDORES', 'Cuentas por pagar a proveedores'),
('300000', 'VENTAS', 'Ingresos por ventas'),
('400000', 'COMPRAS', 'Gastos de compras'),
('500000', 'GASTOS GENERALES', 'Gastos operativos generales'),
('600000', 'INVENTARIO', 'Valor del inventario');

INSERT IGNORE INTO tipo_iva (porcentaje, nombre, descripcion) VALUES
(0.00, 'Exento', 'Sin IVA'),
(10.00, 'Reducido', 'IVA reducido 10%'),
(21.00, 'General', 'IVA general 21%');

INSERT IGNORE INTO centro_coste (nombre, descripcion) VALUES
('Administración', 'Centro de costes administrativos'),
('Ventas', 'Centro de costes de ventas'),
('Producción', 'Centro de costes de producción'),
('Almacén', 'Centro de costes de almacén'),
('Hotel Principal', 'Centro de costes del hotel principal');

-- Recrear las vistas con la collation correcta
DROP VIEW IF EXISTS vista_productos_stock;
DROP VIEW IF EXISTS vista_stock_almacen;
DROP VIEW IF EXISTS vista_mapeos_completos;

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

-- Script adicional para actualizar la vista con el campo descripcion
-- Ejecutar después de la migración de collation si es necesario

-- Recrear la vista con el campo descripcion
DROP VIEW IF EXISTS vista_productos_stock;

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
    p.activo,
    p.fecha_registro
FROM productos p
JOIN medidas m ON p.medida_simbolo = m.simbolo
LEFT JOIN stock_almacen sa ON p.id = sa.producto_id
WHERE p.activo = TRUE
GROUP BY p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre, p.descripcion, p.stock_minimo, p.precio_referencia, p.activo, p.fecha_registro;

SELECT 'Migración de collation completada exitosamente' as mensaje;