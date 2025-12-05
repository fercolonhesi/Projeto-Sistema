<?php

function handleProductos($method, $id = null, $input = null) {
    $db = Database::getInstance()->getConnection();

    if ($method === 'GET') {
        if ($id) {
            // Get single product
            $sql = 'SELECT p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre as medida_nombre, p.descripcion, COALESCE(SUM(sa.cantidad), 0) as stock_actual, p.stock_minimo, p.precio_referencia, CASE WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo THEN \'BAJO\' WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo * 1.5 THEN \'MEDIO\' ELSE \'OK\' END as estado_stock, p.tipo_producto_id, tp.nombre as tipo_producto_nombre, p.cuenta_contable_id, cc.nombre as cuenta_contable_nombre, cc.codigo as cuenta_contable_codigo, p.tipo_iva_id, ti.porcentaje as tipo_iva_porcentaje, ti.nombre as tipo_iva_nombre, p.centro_coste_id, cco.nombre as centro_coste_nombre, p.activo, p.fecha_registro FROM productos p JOIN medidas m ON p.medida_simbolo = m.simbolo LEFT JOIN stock_almacen sa ON p.id = sa.producto_id LEFT JOIN tipo_producto tp ON p.tipo_producto_id = tp.id LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id LEFT JOIN tipo_iva ti ON p.tipo_iva_id = ti.id LEFT JOIN centro_coste cco ON p.centro_coste_id = cco.id WHERE p.id = ? AND p.activo = TRUE GROUP BY p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre, p.descripcion, p.stock_minimo, p.precio_referencia, p.tipo_producto_id, tp.nombre, p.cuenta_contable_id, cc.nombre, cc.codigo, p.tipo_iva_id, ti.porcentaje, ti.nombre, p.centro_coste_id, cco.nombre, p.activo, p.fecha_registro';
            $stmt = $db->prepare($sql);
            $stmt->execute([$id]);
            $result = $stmt->fetch();
            if (!$result) {
                sendJsonResponse(['error' => 'Producto no encontrado'], 404);
            }
            sendJsonResponse($result);
        } else {
            // Get all products
            $sql = 'SELECT p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre as medida_nombre, p.descripcion, COALESCE(SUM(sa.cantidad), 0) as stock_actual, p.stock_minimo, p.precio_referencia, CASE WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo THEN \'BAJO\' WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo * 1.5 THEN \'MEDIO\' ELSE \'OK\' END as estado_stock, p.tipo_producto_id, tp.nombre as tipo_producto_nombre, p.cuenta_contable_id, cc.nombre as cuenta_contable_nombre, cc.codigo as cuenta_contable_codigo, p.tipo_iva_id, ti.porcentaje as tipo_iva_porcentaje, ti.nombre as tipo_iva_nombre, p.centro_coste_id, cco.nombre as centro_coste_nombre, p.activo, p.fecha_registro FROM productos p JOIN medidas m ON p.medida_simbolo = m.simbolo LEFT JOIN stock_almacen sa ON p.id = sa.producto_id LEFT JOIN tipo_producto tp ON p.tipo_producto_id = tp.id LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id LEFT JOIN tipo_iva ti ON p.tipo_iva_id = ti.id LEFT JOIN centro_coste cco ON p.centro_coste_id = cco.id WHERE p.activo = TRUE GROUP BY p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre, p.descripcion, p.stock_minimo, p.precio_referencia, p.tipo_producto_id, tp.nombre, p.cuenta_contable_id, cc.nombre, cc.codigo, p.tipo_iva_id, ti.porcentaje, ti.nombre, p.centro_coste_id, cco.nombre, p.activo, p.fecha_registro ORDER BY p.nombre';
            $stmt = $db->query($sql);
            sendJsonResponse($stmt->fetchAll());
        }
    } elseif ($method === 'POST') {
        validateRequired($input, ['nombre', 'medida_simbolo']);

        $finalCodigo = $input['codigo'] ?? 'PROD-' . time();

        $sql = 'INSERT INTO productos (nombre, codigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia, stock_minimo, tipo_producto_id, cuenta_contable_id, tipo_iva_id, centro_coste_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute([
                trim($input['nombre']),
                $finalCodigo,
                $input['barcode'] ?? null,
                $input['categoria'] ?? 'otros',
                $input['medida_simbolo'],
                $input['descripcion'] ?? null,
                $input['precio_referencia'] ?? 0,
                $input['stock_minimo'] ?? 0,
                $input['tipo_producto_id'] ?? null,
                $input['cuenta_contable_id'] ?? null,
                $input['tipo_iva_id'] ?? null,
                $input['centro_coste_id'] ?? null
            ]);

            sendJsonResponse([
                'id' => $db->lastInsertId(),
                'message' => 'Producto registrado exitosamente',
                'producto' => ['id' => $db->lastInsertId(), 'nombre' => trim($input['nombre']), 'codigo' => $finalCodigo, 'barcode' => $input['barcode'] ?? null]
            ]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                sendJsonResponse(['error' => 'Ya existe un producto con ese código o barcode'], 400);
            }
            throw $e;
        }
    } elseif ($method === 'PUT' && $id) {
        validateRequired($input, ['nombre', 'medida_simbolo']);

        $sql = 'UPDATE productos SET nombre = ?, codigo = ?, barcode = ?, categoria = ?, medida_simbolo = ?, descripcion = ?, precio_referencia = ?, stock_minimo = ?, tipo_producto_id = ?, cuenta_contable_id = ?, tipo_iva_id = ?, centro_coste_id = ? WHERE id = ?';

        try {
            $stmt = $db->prepare($sql);
            $stmt->execute([
                trim($input['nombre']),
                $input['codigo'] ?? null,
                $input['barcode'] ?? null,
                $input['categoria'] ?? null,
                $input['medida_simbolo'],
                $input['descripcion'] ?? null,
                $input['precio_referencia'] ?? 0,
                $input['stock_minimo'] ?? 0,
                $input['tipo_producto_id'] ?? null,
                $input['cuenta_contable_id'] ?? null,
                $input['tipo_iva_id'] ?? null,
                $input['centro_coste_id'] ?? null,
                $id
            ]);

            if ($stmt->rowCount() === 0) {
                sendJsonResponse(['error' => 'Producto no encontrado'], 404);
            }

            sendJsonResponse(['message' => 'Producto actualizado exitosamente']);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                sendJsonResponse(['error' => 'Ya existe un producto con ese código o barcode'], 400);
            }
            throw $e;
        }
    } elseif ($method === 'DELETE' && $id) {
        $stmt = $db->prepare('UPDATE productos SET activo = FALSE WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            sendJsonResponse(['error' => 'Producto no encontrado'], 404);
        }

        sendJsonResponse(['message' => 'Producto eliminado exitosamente']);
    }
}

function handleProductosConsolidados() {
    $db = Database::getInstance()->getConnection();

    $sql = 'SELECT p.id as producto_interno_id, p.nombre as producto_interno, p.codigo as codigo_interno, p.medida_simbolo as unidad_interna, GROUP_CONCAT(DISTINCT CONCAT(\'{"proveedor_id":\', pr.id, \',"proveedor_nombre":"\', pr.nombre, \'","codigo_proveedor":"\', COALESCE(m.codigo_proveedor, \'\'), \'","precio_proveedor":\', COALESCE(m.precio_ultima_compra, 0), \',"nombre_proveedor":"\', m.nombre_proveedor, \'","fecha_ultima_compra":"\', COALESCE(m.fecha_ultima_compra, \'\'), \'}\') SEPARATOR \'|\') as proveedores_info FROM productos p LEFT JOIN mapeos m ON p.id = m.producto_id AND m.activo = TRUE LEFT JOIN proveedores pr ON m.proveedor_id = pr.id AND pr.activo = TRUE WHERE p.activo = TRUE GROUP BY p.id, p.nombre, p.codigo, p.medida_simbolo ORDER BY p.nombre';

    $stmt = $db->query($sql);
    $results = $stmt->fetchAll();

    $productosConsolidados = [];
    foreach ($results as $row) {
        $proveedores = [];
        if ($row['proveedores_info']) {
            $infoParts = explode('|', $row['proveedores_info']);
            foreach ($infoParts as $info) {
                $proveedor = json_decode($info, true);
                if ($proveedor) {
                    $proveedores[] = $proveedor;
                }
            }
        }

        $productosConsolidados[] = [
            'producto_interno_id' => $row['producto_interno_id'],
            'producto_interno' => $row['producto_interno'],
            'codigo_interno' => $row['codigo_interno'],
            'unidad_interna' => $row['unidad_interna'],
            'proveedores' => $proveedores
        ];
    }

    sendJsonResponse($productosConsolidados);
}

function handlePreciosMasBaratos() {
    $db = Database::getInstance()->getConnection();

    $sql = 'SELECT p.id as producto_id, p.nombre as producto_nombre, p.codigo as producto_codigo, m.nombre_proveedor, m.precio_ultima_compra, pr.nombre as proveedor_nombre, ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY m.precio_ultima_compra ASC) as ranking FROM productos p JOIN mapeos m ON p.id = m.producto_id JOIN proveedores pr ON m.proveedor_id = pr.id WHERE p.activo = TRUE AND m.activo = TRUE AND pr.activo = TRUE AND m.precio_ultima_compra > 0 ORDER BY p.nombre, m.precio_ultima_compra';

    $stmt = $db->query($sql);
    $results = $stmt->fetchAll();

    $preciosBaratos = [];
    foreach ($results as $row) {
        $key = $row['producto_id'];
        if (!isset($preciosBaratos[$key]) || $row['precio_ultima_compra'] < $preciosBaratos[$key]['precio']) {
            $preciosBaratos[$key] = [
                'producto_id' => $row['producto_id'],
                'producto_nombre' => $row['producto_nombre'],
                'producto_codigo' => $row['producto_codigo'],
                'precio' => $row['precio_ultima_compra'],
                'proveedor' => $row['nombre_proveedor'],
                'nombre_proveedor' => $row['proveedor_nombre']
            ];
        }
    }

    sendJsonResponse(array_values($preciosBaratos));
}