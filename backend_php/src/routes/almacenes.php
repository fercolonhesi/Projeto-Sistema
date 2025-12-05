<?php

function handleAlmacenes($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare('SELECT * FROM almacenes WHERE id = ? AND activo = TRUE');
            $stmt->execute([$id]);
            $result = $stmt->fetch();
            if (!$result) {
                sendJsonResponse(['error' => 'Almacén no encontrado'], 404);
            }
            sendJsonResponse($result);
        } else {
            $stmt = $db->query('SELECT * FROM almacenes WHERE activo = TRUE ORDER BY nombre');
            sendJsonResponse($stmt->fetchAll());
        }
    } elseif ($method === 'POST') {
        validateRequired($input, ['nombre']);

        $stmt = $db->prepare('INSERT INTO almacenes (nombre, ubicacion, descripcion) VALUES (?, ?, ?)');
        $stmt->execute([
            trim($input['nombre']),
            $input['ubicacion'] ?? null,
            $input['descripcion'] ?? null
        ]);

        sendJsonResponse([
            'id' => $db->lastInsertId(),
            'message' => 'Almacén registrado exitosamente',
            'almacen' => ['id' => $db->lastInsertId(), 'nombre' => trim($input['nombre'])]
        ]);
    } elseif ($method === 'PUT' && $id) {
        $stmt = $db->prepare('UPDATE almacenes SET nombre = ?, ubicacion = ?, descripcion = ? WHERE id = ?');
        $stmt->execute([
            $input['nombre'] ?? null,
            $input['ubicacion'] ?? null,
            $input['descripcion'] ?? null,
            $id
        ]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Almacén no encontrado'], 404);
        }

        sendJsonResponse(['message' => 'Almacén actualizado exitosamente']);
    } elseif ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('UPDATE almacenes SET activo = FALSE WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Almacén no encontrado'], 404);
        }

        sendJsonResponse(['message' => 'Almacén eliminado exitosamente']);
    }
}