<?php

function handleMedidas($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        $stmt = $db->query('SELECT * FROM medidas WHERE activo = TRUE ORDER BY nombre');
        sendJsonResponse($stmt->fetchAll());
    } elseif ($method === 'POST') {
        validateRequired($input, ['nombre', 'simbolo']);

        $stmt = $db->prepare('INSERT INTO medidas (nombre, simbolo, tipo, descripcion) VALUES (?, ?, ?, ?)');
        try {
            $stmt->execute([
                trim($input['nombre']),
                trim($input['simbolo']),
                $input['tipo'] ?? null,
                $input['descripcion'] ?? null
            ]);
            sendJsonResponse([
                'id' => $db->lastInsertId(),
                'message' => 'Medida registrada exitosamente'
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) { // Duplicate entry
                sendJsonResponse(['error' => 'Ya existe una medida con ese símbolo'], 400);
            }
            throw $e;
        }
    } elseif ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('UPDATE medidas SET activo = FALSE WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Medida no encontrada'], 404);
        }

        sendJsonResponse(['message' => 'Medida eliminada exitosamente']);
    }
}