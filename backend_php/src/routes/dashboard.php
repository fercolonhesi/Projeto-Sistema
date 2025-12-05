<?php

function handleDashboard() {
    $db = Database::getInstance()->getConnection();

    $queries = [
        'SELECT COUNT(*) as total FROM proveedores WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM productos WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM medidas WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM mapeos WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM almacenes WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM ordenes_compra WHERE estado IN ("borrador", "enviada")',
        'SELECT COUNT(*) as total FROM facturas WHERE estado IN ("recibida", "procesando", "discrepancias")',
        'SELECT COUNT(*) as total FROM (SELECT p.id, CASE WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo THEN \'BAJO\' ELSE \'OK\' END as estado_stock FROM productos p LEFT JOIN stock_almacen sa ON p.id = sa.producto_id WHERE p.activo = TRUE GROUP BY p.id, p.stock_minimo HAVING estado_stock = \'BAJO\') as productos_bajo_stock'
    ];

    $results = [];
    foreach ($queries as $query) {
        $stmt = $db->query($query);
        $results[] = $stmt->fetch()['total'];
    }

    sendJsonResponse([
        'proveedores' => $results[0],
        'productos' => $results[1],
        'medidas' => $results[2],
        'mapeos' => $results[3],
        'almacenes' => $results[4],
        'ordenes_pendientes' => $results[5],
        'facturas_pendientes' => $results[6],
        'productos_bajo_stock' => $results[7]
    ]);
}