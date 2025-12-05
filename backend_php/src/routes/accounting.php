<?php

function handleTiposProducto() {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query('SELECT * FROM tipo_producto WHERE activo = TRUE ORDER BY nombre');
    sendJsonResponse($stmt->fetchAll());
}

function handleTiposProductoCreate($input) {
    validateRequired($input, ['nombre']);

    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare('INSERT INTO tipo_producto (nombre, descripcion) VALUES (?, ?)');

    try {
        $stmt->execute([trim($input['nombre']), $input['descripcion'] ?? null]);
        sendJsonResponse([
            'id' => $db->lastInsertId(),
            'message' => 'Tipo de producto registrado exitosamente'
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            sendJsonResponse(['error' => 'Ya existe un tipo de producto con ese nombre'], 400);
        }
        throw $e;
    }
}

function handleCuentasContables() {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query('SELECT * FROM cuenta_contable WHERE activo = TRUE ORDER BY codigo');
    sendJsonResponse($stmt->fetchAll());
}

function handleCuentasContablesCreate($input) {
    validateRequired($input, ['codigo', 'nombre']);

    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare('INSERT INTO cuenta_contable (codigo, nombre, descripcion) VALUES (?, ?, ?)');

    try {
        $stmt->execute([trim($input['codigo']), trim($input['nombre']), $input['descripcion'] ?? null]);
        sendJsonResponse([
            'id' => $db->lastInsertId(),
            'message' => 'Cuenta contable registrada exitosamente'
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            sendJsonResponse(['error' => 'Ya existe una cuenta contable con ese código'], 400);
        }
        throw $e;
    }
}

function handleTiposIVA() {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query('SELECT * FROM tipo_iva WHERE activo = TRUE ORDER BY porcentaje');
    sendJsonResponse($stmt->fetchAll());
}

function handleTiposIVACreate($input) {
    if (!isset($input['porcentaje'])) {
        sendJsonResponse(['error' => 'El porcentaje es obligatorio'], 400);
    }

    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare('INSERT INTO tipo_iva (porcentaje, nombre, descripcion) VALUES (?, ?, ?)');

    try {
        $stmt->execute([floatval($input['porcentaje']), $input['nombre'] ?? null, $input['descripcion'] ?? null]);
        sendJsonResponse([
            'id' => $db->lastInsertId(),
            'message' => 'Tipo de IVA registrado exitosamente'
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            sendJsonResponse(['error' => 'Ya existe un tipo de IVA con ese porcentaje'], 400);
        }
        throw $e;
    }
}

function handleCentrosCoste() {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query('SELECT * FROM centro_coste WHERE activo = TRUE ORDER BY nombre');
    sendJsonResponse($stmt->fetchAll());
}

function handleCentrosCosteCreate($input) {
    validateRequired($input, ['nombre']);

    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare('INSERT INTO centro_coste (nombre, descripcion) VALUES (?, ?)');

    try {
        $stmt->execute([trim($input['nombre']), $input['descripcion'] ?? null]);
        sendJsonResponse([
            'id' => $db->lastInsertId(),
            'message' => 'Centro de coste registrado exitosamente'
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            sendJsonResponse(['error' => 'Ya existe un centro de coste con ese nombre'], 400);
        }
        throw $e;
    }
}