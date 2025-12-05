<?php

function handleProveedores($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        if ($id) {
            // Get single proveedor
            $stmt = $db->prepare('SELECT p.*, cc.nombre as cuenta_contable_nombre, cc.codigo as cuenta_contable_codigo FROM proveedores p LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id WHERE p.id = ? AND p.activo = TRUE');
            $stmt->execute([$id]);
            $result = $stmt->fetch();
            if (!$result) {
                sendJsonResponse(['error' => 'Proveedor no encontrado'], 404);
            }
            sendJsonResponse($result);
        } else {
            // Get all proveedores
            $stmt = $db->query('SELECT p.*, cc.nombre as cuenta_contable_nombre, cc.codigo as cuenta_contable_codigo FROM proveedores p LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id WHERE p.activo = TRUE ORDER BY p.nombre');
            sendJsonResponse($stmt->fetchAll());
        }
    } elseif ($method === 'POST') {
        // Create proveedor
        validateRequired($input, ['nombre']);

        $stmt = $db->prepare('INSERT INTO proveedores (nombre, rif, telefono, email, direccion, ciudad, codigo_postal, provincia, cuenta_contable_id, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            trim($input['nombre']),
            $input['rif'] ?? null,
            $input['telefono'] ?? null,
            $input['email'] ?? null,
            $input['direccion'] ?? null,
            $input['ciudad'] ?? null,
            $input['codigo_postal'] ?? null,
            $input['provincia'] ?? null,
            $input['cuenta_contable_id'] ?? null,
            $input['notas'] ?? null
        ]);

        sendJsonResponse([
            'id' => $db->lastInsertId(),
            'message' => 'Proveedor registrado exitosamente',
            'proveedor' => ['id' => $db->lastInsertId(), 'nombre' => trim($input['nombre'])]
        ]);
    } elseif ($method === 'PUT' && $id) {
        // Update proveedor
        $stmt = $db->prepare('UPDATE proveedores SET nombre = ?, rif = ?, telefono = ?, email = ?, direccion = ?, ciudad = ?, codigo_postal = ?, provincia = ?, cuenta_contable_id = ?, notas = ? WHERE id = ?');
        $stmt->execute([
            $input['nombre'] ?? null,
            $input['rif'] ?? null,
            $input['telefono'] ?? null,
            $input['email'] ?? null,
            $input['direccion'] ?? null,
            $input['ciudad'] ?? null,
            $input['codigo_postal'] ?? null,
            $input['provincia'] ?? null,
            $input['cuenta_contable_id'] ?? null,
            $input['notas'] ?? null,
            $id
        ]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Proveedor no encontrado'], 404);
        }

        sendJsonResponse(['message' => 'Proveedor actualizado exitosamente']);
    } elseif ($method === 'DELETE' && $id) {
        // Soft delete
        $stmt = $db->prepare('UPDATE proveedores SET activo = FALSE WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Proveedor no encontrado'], 404);
        }

        sendJsonResponse(['message' => 'Proveedor eliminado exitosamente']);
    }
}