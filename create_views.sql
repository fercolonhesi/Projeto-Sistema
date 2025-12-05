-- Script para crear vistas faltantes
USE inventario_db;

-- Vista para resumen de productos con stock total
CREATE OR REPLACE VIEW vista_productos_stock AS
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
CREATE OR REPLACE VIEW vista_stock_almacen AS
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
CREATE OR REPLACE VIEW vista_mapeos_completos AS
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

SELECT 'Vistas creadas exitosamente!' as mensaje;