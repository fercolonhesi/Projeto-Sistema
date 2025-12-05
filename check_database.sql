-- Script para verificar la estructura de la tabla productos
-- Ejecutar este script para ver qué campos tiene la tabla productos

USE inventario_db;

-- Ver estructura de la tabla productos
DESCRIBE productos;

-- Ver si hay datos en la tabla productos
SELECT COUNT(*) as total_productos FROM productos;

-- Ver algunos productos con sus descripciones
SELECT id, nombre, descripcion FROM productos LIMIT 5;

-- Ver la vista actual
DESCRIBE vista_productos_stock;

-- Ver si la vista incluye descripcion
SELECT * FROM vista_productos_stock LIMIT 1;