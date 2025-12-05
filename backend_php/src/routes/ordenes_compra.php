<?php

function handleOrdenesCompra($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        if ($id) {
            // Get single order
            $sqlOrden = 'SELECT oc.*, p.nombre as proveedor_nombre, p.email as proveedor_email FROM ordenes_compra oc JOIN proveedores p ON oc.proveedor_id = p.id WHERE oc.id = ?';
            $stmt = $db->prepare($sqlOrden);
            $stmt->execute([$id]);
            $orden = $stmt->fetch();

            if (!$orden) {
                sendJsonResponse(['error' => 'Orden de compra no encontrada'], 404);
            }

            $sqlDetalles = 'SELECT ocd.*, m.nombre_proveedor, m.codigo_proveedor, pr.nombre as producto_nombre, pr.codigo as producto_codigo FROM ordenes_compra_detalle ocd JOIN mapeos m ON ocd.mapeo_id = m.id JOIN productos pr ON m.producto_id = pr.id WHERE ocd.orden_compra_id = ?';
            $stmt = $db->prepare($sqlDetalles);
            $stmt->execute([$id]);
            $detalles = $stmt->fetchAll();

            sendJsonResponse(array_merge($orden, ['detalles' => $detalles]));
        } else {
            // Get all orders
            $sql = 'SELECT oc.*, p.nombre as proveedor_nombre FROM ordenes_compra oc JOIN proveedores p ON oc.proveedor_id = p.id ORDER BY oc.fecha_creacion DESC';
            $stmt = $db->query($sql);
            sendJsonResponse($stmt->fetchAll());
        }
    } elseif ($method === 'POST') {
        validateRequired($input, ['proveedor_id', 'detalles']);

        $numeroOrden = 'OC-' . time();
        $fechaCreacion = date('Y-m-d');

        $sqlOrden = 'INSERT INTO ordenes_compra (numero_orden, proveedor_id, fecha_creacion, fecha_esperada_recepcion, notas) VALUES (?, ?, ?, ?, ?)';

        $stmt = $db->prepare($sqlOrden);
        $stmt->execute([
            $numeroOrden,
            $input['proveedor_id'],
            $fechaCreacion,
            $input['fecha_esperada_recepcion'] ?? null,
            $input['notas'] ?? null
        ]);

        $ordenId = $db->lastInsertId();
        $total = 0;

        // Insert details
        $sqlDetalle = 'INSERT INTO ordenes_compra_detalle (orden_compra_id, mapeo_id, cantidad_solicitada, precio_unitario) VALUES (?, ?, ?, ?)';

        foreach ($input['detalles'] as $detalle) {
            $total += $detalle['cantidad'] * $detalle['precio_unitario'];
            $stmt = $db->prepare($sqlDetalle);
            $stmt->execute([$ordenId, $detalle['mapeo_id'], $detalle['cantidad'], $detalle['precio_unitario']]);
        }

        // Update totals
        $stmt = $db->prepare('UPDATE ordenes_compra SET subtotal = ?, total = ? WHERE id = ?');
        $stmt->execute([$total, $total, $ordenId]);

        sendJsonResponse([
            'id' => $ordenId,
            'numero_orden' => $numeroOrden,
            'message' => 'Orden de compra creada exitosamente'
        ]);
    }
}

function handleOrdenCompraEstado($id, $input) {
    $db = Database::getInstance()->getConnection();

    $stmt = $db->prepare('UPDATE ordenes_compra SET estado = ? WHERE id = ?');
    $stmt->execute([$input['estado'], $id]);

    if ($stmt->rowCount() === 0) {
        sendJsonResponse(['error' => 'Orden de compra no encontrada'], 404);
    }

    sendJsonResponse(['message' => 'Estado de orden actualizado exitosamente']);
}