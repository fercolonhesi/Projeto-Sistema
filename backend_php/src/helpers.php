<?php

function sendJsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

function validateRequired($data, $fields) {
    foreach ($fields as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            sendJsonResponse(['error' => "El campo {$field} es obligatorio"], 400);
        }
    }
}

function estandarizarProductoProveedor($producto) {
    $nombre = $producto['nombre'] ?? '';
    $unidad = $producto['unidad'] ?? '';
    $cantidad = floatval($producto['cantidad'] ?? 0);
    $precio = floatval($producto['precio'] ?? 0);
    $iva = floatval($producto['iva'] ?? 0);

    // Normalizar nombre
    $nombre = strtolower(trim($nombre));

    // Remover caracteres especiales
    $nombre = preg_replace('/[^\w\s]/', ' ', $nombre);

    // Normalizar espacios
    $nombre = preg_replace('/\s+/', ' ', $nombre);

    // Remover palabras comunes de unidades del nombre
    $palabrasUnidad = ['kg', 'g', 'l', 'ml', 'unidad', 'unidades', 'caja', 'cajas', 'paquete', 'paquetes', 'docena', 'docenas', 'litro', 'litros', 'gramo', 'gramos', 'kilo', 'kilos'];
    foreach ($palabrasUnidad as $palabra) {
        $nombre = preg_replace('/\b' . preg_quote($palabra, '/') . '\b/i', '', $nombre);
    }

    // Estandarizar unidades
    $unidad = strtolower(trim($unidad));

    // Mapear unidades comunes
    $mapaUnidades = [
        'kg' => 'kg',
        'kilo' => 'kg',
        'kilos' => 'kg',
        'kilogramo' => 'kg',
        'kilogramos' => 'kg',
        'g' => 'g',
        'gramo' => 'g',
        'gramos' => 'g',
        'l' => 'l',
        'litro' => 'l',
        'litros' => 'l',
        'ml' => 'ml',
        'mililitro' => 'ml',
        'mililitros' => 'ml',
        'unidad' => 'unidad',
        'unidades' => 'unidad',
        'caja' => 'caja',
        'cajas' => 'caja',
        'paquete' => 'paquete',
        'paquetes' => 'paquete',
        'docena' => 'docena',
        'docenas' => 'docena'
    ];

    $unidad = $mapaUnidades[$unidad] ?? 'unidad';

    return [
        'nombre' => trim($nombre),
        'unidad' => $unidad,
        'cantidad' => $cantidad,
        'precio' => $precio,
        'iva' => $iva
    ];
}

function normalizarNombreProducto($nombre) {
    if (!$nombre) return '';

    $normalizado = strtolower(trim($nombre));

    // Aplicar reglas de normalización
    $normalizado = preg_replace('/[^\w\s]/', ' ', $normalizado);
    $normalizado = preg_replace('/\s+/', ' ', $normalizado);

    // Remover palabras comunes
    $palabrasComunes = ['kg', 'g', 'l', 'ml', 'unidad', 'unidades', 'caja', 'cajas', 'paquete', 'paquetes', 'docena', 'docenas'];
    foreach ($palabrasComunes as $palabra) {
        $normalizado = preg_replace('/\b' . preg_quote($palabra, '/') . '\b/i', '', $normalizado);
    }

    return trim($normalizado);
}

function procesarItemsAlbaran($albaranId) {
    $db = Database::getInstance()->getConnection();

    // Obtener items sin procesar
    $stmt = $db->prepare('SELECT * FROM albaranes_items WHERE albaran_id = ? AND procesado = FALSE');
    $stmt->execute([$albaranId]);
    $items = $stmt->fetchAll();

    $procesados = 0;
    $total = count($items);

    foreach ($items as $item) {
        // Intentar matching automático
        $match = encontrarMatchingProducto($item['nombre_proveedor_crudo'], $item['codigo_proveedor_crudo'], $albaranId);

        if ($match) {
            // Actualizar item con matching encontrado
            $stmt = $db->prepare('UPDATE albaranes_items SET nombre_normalizado = ?, producto_id = ?, mapeo_id = ?, confianza_match = ?, cantidad_final = ?, precio_unitario_final = ?, estado = \'matched\', procesado = TRUE WHERE id = ?');
            $stmt->execute([
                $match['nombre_normalizado'],
                $match['producto_id'],
                $match['mapeo_id'],
                $match['confianza'],
                $item['cantidad_cruda'],
                $item['precio_unitario_crudo'],
                $item['id']
            ]);
            $procesados++;
        } else {
            // Marcar como unmatched para revisión manual
            $nombreNormalizado = normalizarNombreProducto($item['nombre_proveedor_crudo']);
            $stmt = $db->prepare('UPDATE albaranes_items SET nombre_normalizado = ?, estado = \'unmatched\' WHERE id = ?');
            $stmt->execute([$nombreNormalizado, $item['id']]);
        }
    }

    return ['procesados' => $procesados, 'total' => $total];
}

function encontrarMatchingProducto($nombreCrudo, $codigoCrudo, $albaranId) {
    $db = Database::getInstance()->getConnection();

    // Obtener proveedor_id del albarán
    $stmt = $db->prepare('SELECT proveedor_id FROM albaranes_proveedores WHERE id = ?');
    $stmt->execute([$albaranId]);
    $proveedorResult = $stmt->fetch();

    if (!$proveedorResult) return null;

    $proveedorId = $proveedorResult['proveedor_id'];
    $nombreNormalizado = normalizarNombreProducto($nombreCrudo);

    // Buscar en mapeos del proveedor
    $stmt = $db->prepare('SELECT m.*, p.nombre as nombre_producto FROM mapeos m JOIN productos p ON m.producto_id = p.id WHERE m.proveedor_id = ? AND m.activo = TRUE AND p.activo = TRUE');
    $stmt->execute([$proveedorId]);
    $mapeos = $stmt->fetchAll();

    // Buscar por código exacto primero
    if ($codigoCrudo) {
        foreach ($mapeos as $mapeo) {
            if ($mapeo['codigo_proveedor'] === $codigoCrudo) {
                return [
                    'producto_id' => $mapeo['producto_id'],
                    'mapeo_id' => $mapeo['id'],
                    'nombre_normalizado' => $nombreNormalizado,
                    'confianza' => 1.0
                ];
            }
        }
    }

    // Buscar por similitud de nombre
    $matchesNombre = [];
    foreach ($mapeos as $mapeo) {
        $nombreProveedor = normalizarNombreProducto($mapeo['nombre_proveedor']);
        if (strpos($nombreProveedor, $nombreNormalizado) !== false || strpos($nombreNormalizado, $nombreProveedor) !== false) {
            $matchesNombre[] = $mapeo;
        }
    }

    if (!empty($matchesNombre)) {
        $mejorMatch = $matchesNombre[0];
        return [
            'producto_id' => $mejorMatch['producto_id'],
            'mapeo_id' => $mejorMatch['id'],
            'nombre_normalizado' => $nombreNormalizado,
            'confianza' => 0.8
        ];
    }

    return null;
}