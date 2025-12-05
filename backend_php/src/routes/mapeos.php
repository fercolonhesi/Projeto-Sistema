<?php

use PhpOffice\PhpSpreadsheet\IOFactory;

function handleMapeos($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        $stmt = $db->query('SELECT * FROM vista_mapeos_completos ORDER BY proveedor_nombre, nombre_proveedor');
        sendJsonResponse($stmt->fetchAll());
    } elseif ($method === 'POST') {
        validateRequired($input, ['proveedor_id', 'producto_id', 'nombre_proveedor']);

        $sql = 'INSERT INTO mapeos (proveedor_id, producto_id, nombre_proveedor, codigo_proveedor, factor_conversion, notas) VALUES (?, ?, ?, ?, ?, ?)';

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute([
                $input['proveedor_id'],
                $input['producto_id'],
                trim($input['nombre_proveedor']),
                $input['codigo_proveedor'] ?? null,
                $input['factor_conversion'] ?? 1,
                $input['notas'] ?? null
            ]);

            sendJsonResponse([
                'id' => $db->lastInsertId(),
                'message' => 'Mapeo creado exitosamente'
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                sendJsonResponse(['error' => 'Ya existe un mapeo para ese proveedor con ese nombre de producto'], 400);
            }
            throw $e;
        }
    } elseif ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('UPDATE mapeos SET activo = FALSE WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Mapeo no encontrado'], 404);
        }

        sendJsonResponse(['message' => 'Mapeo eliminado exitosamente']);
    }
}

function handleProcesarArchivoProveedor($input) {
    if (!isset($_FILES['archivo'])) {
        sendJsonResponse(['error' => 'No file uploaded'], 400);
    }

    $proveedorId = $input['proveedor_id'] ?? null;
    if (!$proveedorId) {
        sendJsonResponse(['error' => 'Proveedor ID es requerido'], 400);
    }

    $file = $_FILES['archivo'];
    $uploadDir = __DIR__ . '/../../uploads/';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $filePath = $uploadDir . uniqid() . '_' . basename($file['name']);

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        sendJsonResponse(['error' => 'Error uploading file'], 500);
    }

    try {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = $spreadsheet->getActiveSheet();
        $rows = $worksheet->toArray();

        $productosEstandarizados = [];
        foreach ($rows as $index => $row) {
            if ($index === 0) continue; // Skip header

            $codigo = $row[0] ?? '';
            $descripcion = $row[1] ?? '';
            $cantidad = floatval($row[2] ?? 0);
            $unidadMedida = $row[3] ?? '';
            $precio = floatval($row[4] ?? 0);
            $iva = floatval($row[5] ?? 0);

            $productoEstandarizado = estandarizarProductoProveedor([
                'nombre' => $descripcion,
                'codigo' => $codigo,
                'unidad' => $unidadMedida,
                'precio' => $precio,
                'cantidad' => $cantidad,
                'iva' => $iva
            ]);

            $productosEstandarizados[] = [
                'id' => $index,
                'proveedor_id' => intval($proveedorId),
                'nombre_proveedor_original' => $descripcion,
                'codigo_proveedor' => $codigo,
                'unidad_proveedor' => $unidadMedida,
                'precio_proveedor' => $precio,
                'cantidad_proveedor' => $cantidad,
                'iva_proveedor' => $iva,
                'nombre_estandarizado' => $productoEstandarizado['nombre'],
                'unidad_estandarizada' => $productoEstandarizado['unidad'],
                'producto_interno_id' => null,
                'producto_interno_nombre' => null,
                'estado_mapping' => 'pendiente'
            ];
        }

        unlink($filePath); // Clean up

        if (empty($productosEstandarizados)) {
            sendJsonResponse(['error' => 'No se encontraron productos válidos en el archivo'], 400);
        }

        $sessionId = time() . '_' . uniqid();

        sendJsonResponse([
            'productos' => $productosEstandarizados,
            'session_id' => $sessionId,
            'total' => count($productosEstandarizados),
            'proveedor_id' => $proveedorId
        ]);

    } catch (Exception $e) {
        if (file_exists($filePath)) unlink($filePath);
        sendJsonResponse(['error' => 'Error procesando archivo: ' . $e->getMessage()], 500);
    }
}

function handleGuardarArchivoMapeos($input) {
    $sessionId = $input['session_id'] ?? null;
    $mapeos = $input['mapeos'] ?? null;

    if (!$sessionId || !$mapeos || !is_array($mapeos)) {
        sendJsonResponse(['error' => 'Datos de sesión y mapeos requeridos'], 400);
    }

    $mapeosValidos = array_filter($mapeos, function($m) {
        return isset($m['producto_interno_id']);
    });

    if (empty($mapeosValidos)) {
        sendJsonResponse(['error' => 'No hay mapeos válidos para guardar'], 400);
    }

    $db = Database::getInstance()->getConnection();

    $sqlMapeo = 'INSERT INTO mapeos (proveedor_id, producto_id, nombre_proveedor, codigo_proveedor, precio_ultima_compra, fecha_ultima_compra) VALUES (?, ?, ?, ?, ?, CURDATE()) ON DUPLICATE KEY UPDATE precio_ultima_compra = VALUES(precio_ultima_compra), fecha_ultima_compra = CURDATE()';

    $creados = 0;
    $actualizados = 0;

    foreach ($mapeosValidos as $mapeo) {
        $stmt = $db->prepare($sqlMapeo);
        $stmt->execute([
            $mapeo['proveedor_id'],
            $mapeo['producto_interno_id'],
            $mapeo['nombre_proveedor_original'],
            $mapeo['codigo_proveedor'] ?? null,
            $mapeo['precio_proveedor'] ?? null
        ]);

        if ($stmt->rowCount() > 0) {
            if (stripos($db->lastInsertId(), 'duplicate') !== false) {
                $actualizados++;
            } else {
                $creados++;
            }
        }
    }

    sendJsonResponse([
        'message' => 'Mapeos consolidados guardados exitosamente',
        'creados' => $creados,
        'actualizados' => $actualizados,
        'total' => count($mapeosValidos)
    ]);
}