<?php

function handleFacturas($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        $sql = 'SELECT f.*, p.nombre as proveedor_nombre, oc.numero_orden FROM facturas f JOIN proveedores p ON f.proveedor_id = p.id LEFT JOIN ordenes_compra oc ON f.orden_compra_id = oc.id ORDER BY f.fecha_recepcion DESC';
        $stmt = $db->query($sql);
        sendJsonResponse($stmt->fetchAll());
    } elseif ($method === 'POST') {
        validateRequired($input, ['numero_factura', 'proveedor_id', 'detalles']);

        $fechaRecepcion = date('Y-m-d');
        $fechaEmail = isset($input['email_origen']) ? date('Y-m-d H:i:s') : null;

        $total = 0;
        foreach ($input['detalles'] as $d) {
            $total += $d['cantidad'] * $d['precio_unitario'];
        }

        $sqlFactura = 'INSERT INTO facturas (numero_factura, proveedor_id, orden_compra_id, fecha_emision, fecha_recepcion, fecha_email, email_origen, archivo_adjunto, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';

        try {
            $stmt = $db->prepare($sqlFactura);
            $stmt->execute([
                $input['numero_factura'],
                $input['proveedor_id'],
                $input['orden_compra_id'] ?? null,
                $input['fecha_emision'],
                $fechaRecepcion,
                $fechaEmail,
                $input['email_origen'] ?? null,
                $input['archivo_adjunto'] ?? null,
                $total
            ]);

            $facturaId = $db->lastInsertId();

            // Insert details and check discrepancies
            $sqlDetalle = 'INSERT INTO facturas_detalle (factura_id, mapeo_id, cantidad, precio_unitario, cantidad_orden, precio_orden) VALUES (?, ?, ?, ?, ?, ?)';

            $ordenDetalles = [];
            if ($input['orden_compra_id']) {
                $stmt = $db->prepare('SELECT mapeo_id, cantidad_solicitada, precio_unitario FROM ordenes_compra_detalle WHERE orden_compra_id = ?');
                $stmt->execute([$input['orden_compra_id']]);
                $ordenResults = $stmt->fetchAll();
                foreach ($ordenResults as $d) {
                    $ordenDetalles[$d['mapeo_id']] = ['cantidad' => $d['cantidad_solicitada'], 'precio' => $d['precio_unitario']];
                }
            }

            $hasDiscrepancias = false;
            foreach ($input['detalles'] as $detalle) {
                $ordenData = $ordenDetalles[$detalle['mapeo_id']] ?? ['cantidad' => 0, 'precio' => 0];
                $discrepanciaCantidad = $detalle['cantidad'] !== $ordenData['cantidad'];
                $discrepanciaPrecio = $detalle['precio_unitario'] !== $ordenData['precio'];

                if ($discrepanciaCantidad || $discrepanciaPrecio) {
                    $hasDiscrepancias = true;
                }

                $stmt = $db->prepare($sqlDetalle);
                $stmt->execute([
                    $facturaId,
                    $detalle['mapeo_id'],
                    $detalle['cantidad'],
                    $detalle['precio_unitario'],
                    $ordenData['cantidad'],
                    $ordenData['precio']
                ]);
            }

            $estado = $hasDiscrepancias ? 'discrepancias' : 'verificada';
            $stmt = $db->prepare('UPDATE facturas SET estado = ? WHERE id = ?');
            $stmt->execute([$estado, $facturaId]);

            sendJsonResponse([
                'id' => $facturaId,
                'message' => 'Factura registrada exitosamente',
                'estado' => $estado,
                'discrepancias' => $hasDiscrepancias
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                sendJsonResponse(['error' => 'Ya existe una factura con ese número'], 400);
            }
            throw $e;
        }
    }
}

function handleFacturaAprobar($id, $input) {
    validateRequired($input, ['almacen_id']);

    $db = Database::getInstance()->getConnection();

    // Get invoice details
    $sqlDetalles = 'SELECT fd.*, m.producto_id FROM facturas_detalle fd JOIN mapeos m ON fd.mapeo_id = m.id WHERE fd.factura_id = ?';
    $stmt = $db->prepare($sqlDetalles);
    $stmt->execute([$id]);
    $detalles = $stmt->fetchAll();

    // Register stock entries
    $sqlMovimiento = 'INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, precio_unitario, almacen_destino_id, proveedor_id, referencia) VALUES (?, \'entrada\', ?, ?, ?, (SELECT proveedor_id FROM facturas WHERE id = ?), ?)';

    foreach ($detalles as $detalle) {
        $stmt = $db->prepare($sqlMovimiento);
        $stmt->execute([
            $detalle['producto_id'],
            $detalle['cantidad'],
            $detalle['precio_unitario'],
            $input['almacen_id'],
            $id,
            'Factura ' . $id
        ]);
    }

    // Update invoice status
    $stmt = $db->prepare('UPDATE facturas SET estado = "aprobada", usuario_procesamiento = "sistema" WHERE id = ?');
    $stmt->execute([$id]);

    // Update prices in mappings
    $sqlUpdatePrecio = 'UPDATE mapeos SET precio_ultima_compra = ?, fecha_ultima_compra = CURDATE() WHERE id = ? AND (precio_ultima_compra IS NULL OR precio_ultima_compra != ?)';

    foreach ($detalles as $detalle) {
        $stmt = $db->prepare($sqlUpdatePrecio);
        $stmt->execute([$detalle['precio_unitario'], $detalle['mapeo_id'], $detalle['precio_unitario']]);
    }

    sendJsonResponse(['message' => 'Factura aprobada y stock actualizado exitosamente']);
}