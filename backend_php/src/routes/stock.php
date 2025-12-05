<?php

function handleStockMovimientos() {
    $db = Database::getInstance()->getConnection();

    $sql = 'SELECT m.*, p.nombre as producto_nombre, p.codigo as producto_codigo, pr.nombre as proveedor_nombre, ao.nombre as almacen_origen_nombre, ad.nombre as almacen_destino_nombre FROM movimientos_stock m JOIN productos p ON m.producto_id = p.id LEFT JOIN proveedores pr ON m.proveedor_id = pr.id LEFT JOIN almacenes ao ON m.almacen_origen_id = ao.id LEFT JOIN almacenes ad ON m.almacen_destino_id = ad.id ORDER BY m.fecha_movimiento DESC LIMIT 50';

    $stmt = $db->query($sql);
    sendJsonResponse($stmt->fetchAll());
}

function handleStockMovimiento($input) {
    validateRequired($input, ['producto_id', 'tipo_movimiento', 'cantidad']);

    $db = Database::getInstance()->getConnection();

    // Validaciones específicas
    if ($input['tipo_movimiento'] === 'transferencia' && (!isset($input['almacen_origen_id']) || !isset($input['almacen_destino_id']))) {
        sendJsonResponse(['error' => 'Para transferencias se requieren almacén origen y destino'], 400);
    }

    if (in_array($input['tipo_movimiento'], ['entrada', 'ajuste']) && !isset($input['almacen_destino_id'])) {
        sendJsonResponse(['error' => 'Para entradas o ajustes se requiere almacén destino'], 400);
    }

    if ($input['tipo_movimiento'] === 'salida' && !isset($input['almacen_origen_id'])) {
        sendJsonResponse(['error' => 'Para salidas se requiere almacén origen'], 400);
    }

    $sql = 'INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, precio_unitario, almacen_origen_id, almacen_destino_id, proveedor_id, motivo, referencia, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    $stmt = $db->prepare($sql);
    $stmt->execute([
        $input['producto_id'],
        $input['tipo_movimiento'],
        $input['cantidad'],
        $input['precio_unitario'] ?? 0,
        $input['almacen_origen_id'] ?? null,
        $input['almacen_destino_id'] ?? null,
        $input['proveedor_id'] ?? null,
        $input['motivo'] ?? null,
        $input['referencia'] ?? null,
        $input['notas'] ?? null
    ]);

    sendJsonResponse([
        'id' => $db->lastInsertId(),
        'message' => 'Movimiento de stock registrado exitosamente'
    ]);
}

function handleStockAlmacen($almacenId) {
    $db = Database::getInstance()->getConnection();

    $sql = 'SELECT sa.*, p.nombre as producto_nombre, p.codigo as producto_codigo, p.barcode, p.medida_simbolo FROM stock_almacen sa JOIN productos p ON sa.producto_id = p.id WHERE sa.almacen_id = ? AND p.activo = TRUE ORDER BY p.nombre';

    $stmt = $db->prepare($sql);
    $stmt->execute([$almacenId]);
    sendJsonResponse($stmt->fetchAll());
}

function handleStockTransferencia($input) {
    validateRequired($input, ['producto_id', 'cantidad', 'almacen_origen_id', 'almacen_destino_id']);

    if ($input['almacen_origen_id'] === $input['almacen_destino_id']) {
        sendJsonResponse(['error' => 'El almacén origen y destino deben ser diferentes'], 400);
    }

    $db = Database::getInstance()->getConnection();

    // Verificar stock disponible
    $stmt = $db->prepare('SELECT cantidad FROM stock_almacen WHERE almacen_id = ? AND producto_id = ?');
    $stmt->execute([$input['almacen_origen_id'], $input['producto_id']]);
    $result = $stmt->fetch();

    if (!$result || $result['cantidad'] < $input['cantidad']) {
        sendJsonResponse(['error' => 'Stock insuficiente en almacén origen'], 400);
    }

    // Registrar movimiento de transferencia
    $sql = 'INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, almacen_origen_id, almacen_destino_id, notas) VALUES (?, \'transferencia\', ?, ?, ?, ?)';

    $stmt = $db->prepare($sql);
    $stmt->execute([
        $input['producto_id'],
        $input['cantidad'],
        $input['almacen_origen_id'],
        $input['almacen_destino_id'],
        $input['notas'] ?? null
    ]);

    sendJsonResponse([
        'id' => $db->lastInsertId(),
        'message' => 'Transferencia realizada exitosamente'
    ]);
}