<?php

function handleConfiguracionHotel($method, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        $stmt = $db->query('SELECT * FROM configuracion_hotel ORDER BY id DESC LIMIT 1');
        $result = $stmt->fetch();

        if (!$result) {
            sendJsonResponse([
                'id' => null,
                'nombre_legal' => '',
                'nombre_social' => '',
                'direccion' => '',
                'ciudad' => '',
                'codigo_postal' => '',
                'nif' => '',
                'telefono' => '',
                'email_contacto' => ''
            ]);
        }

        sendJsonResponse($result);
    } elseif ($method === 'POST') {
        // Check if config exists
        $stmt = $db->query('SELECT id FROM configuracion_hotel ORDER BY id DESC LIMIT 1');
        $existing = $stmt->fetch();

        if ($existing) {
            // Update
            $sql = 'UPDATE configuracion_hotel SET nombre_legal = ?, nombre_social = ?, direccion = ?, ciudad = ?, codigo_postal = ?, nif = ?, telefono = ?, email_contacto = ? WHERE id = ?';
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $input['nombre_legal'] ?? '',
                $input['nombre_social'] ?? '',
                $input['direccion'] ?? '',
                $input['ciudad'] ?? '',
                $input['codigo_postal'] ?? '',
                $input['nif'] ?? '',
                $input['telefono'] ?? '',
                $input['email_contacto'] ?? '',
                $existing['id']
            ]);

            sendJsonResponse([
                'id' => $existing['id'],
                'message' => 'Configuración del hotel actualizada exitosamente'
            ]);
        } else {
            // Insert
            $sql = 'INSERT INTO configuracion_hotel (nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $input['nombre_legal'] ?? '',
                $input['nombre_social'] ?? '',
                $input['direccion'] ?? '',
                $input['ciudad'] ?? '',
                $input['codigo_postal'] ?? '',
                $input['nif'] ?? '',
                $input['telefono'] ?? '',
                $input['email_contacto'] ?? ''
            ]);

            sendJsonResponse([
                'id' => $db->lastInsertId(),
                'message' => 'Configuración del hotel creada exitosamente'
            ]);
        }
    }
}

function handleReglasNormalizacion() {
    $db = Database::getInstance()->getConnection();
    $stmt = $db->query('SELECT rn.*, p.nombre as proveedor_nombre FROM reglas_normalizacion rn LEFT JOIN proveedores p ON rn.proveedor_id = p.id WHERE rn.activo = TRUE ORDER BY rn.proveedor_id, rn.fecha_registro DESC');
    sendJsonResponse($stmt->fetchAll());
}

function handleReglasNormalizacionCreate($input) {
    validateRequired($input, ['patron', 'reemplazo']);

    $db = Database::getInstance()->getConnection();
    $stmt = $db->prepare('INSERT INTO reglas_normalizacion (proveedor_id, patron, reemplazo, descripcion) VALUES (?, ?, ?, ?)');

    $stmt->execute([
        $input['proveedor_id'] ?? null,
        $input['patron'],
        $input['reemplazo'],
        $input['descripcion'] ?? null
    ]);

    sendJsonResponse([
        'id' => $db->lastInsertId(),
        'message' => 'Regla de normalización creada exitosamente'
    ]);
}