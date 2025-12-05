-- Script para actualizar la vista vista_productos_stock e incluir campos contables
-- Ejecutar este script en la base de datos existente para que aparezcan las descripciones y campos contables

USE inventario_db;

-- Recrear la vista con los campos contables incluidos
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

SELECT 'Vista actualizada correctamente. Las descripciones y campos contables ahora aparecerán en el frontend.' as mensaje;