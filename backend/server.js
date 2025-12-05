const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: '../uploads/' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Configuración de base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'sistema',
    password: '213354fer', // CAMBIA AQUÍ TU CONTRASEÑA DE MYSQL
    database: 'inventario_db',
    multipleStatements: true
});

// Conectar a la base de datos
db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        console.log('💡 Verifica que:');
        console.log('   - MySQL esté corriendo');
        console.log('   - La contraseña sea correcta');
        console.log('   - La base de datos "inventario_db" exista');
        process.exit(1);
    }
    console.log('✅ Conectado a MySQL - Base de datos: inventario_db');
});

// ==================== RUTAS API ====================

// Dashboard
app.get('/api/dashboard', (req, res) => {
    const queries = [
        'SELECT COUNT(*) as total FROM proveedores WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM productos WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM medidas WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM mapeos WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM almacenes WHERE activo = TRUE',
        'SELECT COUNT(*) as total FROM ordenes_compra WHERE estado IN ("borrador", "enviada")',
        'SELECT COUNT(*) as total FROM facturas WHERE estado IN ("recibida", "procesando", "discrepancias")',
        `SELECT COUNT(*) as total FROM (
            SELECT p.id,
                CASE
                    WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo THEN 'BAJO'
                    ELSE 'OK'
                END as estado_stock
            FROM productos p
            LEFT JOIN stock_almacen sa ON p.id = sa.producto_id
            WHERE p.activo = TRUE
            GROUP BY p.id, p.stock_minimo
            HAVING estado_stock = 'BAJO'
        ) as productos_bajo_stock`
    ];

    Promise.all(queries.map(query => {
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                else resolve(results[0].total);
            });
        });
    }))
    .then(results => {
        res.json({
            proveedores: results[0],
            productos: results[1],
            medidas: results[2],
            mapeos: results[3],
            almacenes: results[4],
            ordenes_pendientes: results[5],
            facturas_pendientes: results[6],
            productos_bajo_stock: results[7]
        });
    })
    .catch(err => {
        console.error('Error en dashboard:', err);
        res.status(500).json({ error: err.message });
    });
});

// Proveedores
app.get('/api/proveedores', (req, res) => {
    const sql = `
        SELECT p.*, cc.nombre as cuenta_contable_nombre, cc.codigo as cuenta_contable_codigo
        FROM proveedores p
        LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id
        WHERE p.activo = TRUE
        ORDER BY p.nombre
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo proveedores:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/proveedores', (req, res) => {
    const { nombre, rif, telefono, email, direccion, ciudad, codigo_postal, provincia, cuenta_contable_id, notas } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del proveedor es obligatorio' });
    }

    const sql = 'INSERT INTO proveedores (nombre, rif, telefono, email, direccion, ciudad, codigo_postal, provincia, cuenta_contable_id, notas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    db.query(sql, [nombre.trim(), rif, telefono, email, direccion, ciudad, codigo_postal, provincia, cuenta_contable_id || null, notas], (err, result) => {
        if (err) {
            console.error('Error creando proveedor:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Proveedor registrado exitosamente',
            proveedor: { id: result.insertId, nombre: nombre.trim() }
        });
    });
});

app.put('/api/proveedores/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, rif, telefono, email, direccion, ciudad, codigo_postal, provincia, cuenta_contable_id, notas } = req.body;

    const sql = 'UPDATE proveedores SET nombre = ?, rif = ?, telefono = ?, email = ?, direccion = ?, ciudad = ?, codigo_postal = ?, provincia = ?, cuenta_contable_id = ?, notas = ? WHERE id = ?';

    db.query(sql, [nombre, rif, telefono, email, direccion, ciudad, codigo_postal, provincia, cuenta_contable_id || null, notas, id], (err, result) => {
        if (err) {
            console.error('Error actualizando proveedor:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }

        res.json({ message: 'Proveedor actualizado exitosamente' });
    });
});

app.delete('/api/proveedores/:id', (req, res) => {
    const { id } = req.params;
    
    db.query('UPDATE proveedores SET activo = FALSE WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error eliminando proveedor:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado' });
        }
        
        res.json({ message: 'Proveedor eliminado exitosamente' });
    });
});

// Medidas
app.get('/api/medidas', (req, res) => {
    db.query('SELECT * FROM medidas WHERE activo = TRUE ORDER BY nombre', (err, results) => {
        if (err) {
            console.error('Error obteniendo medidas:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/medidas', (req, res) => {
    const { nombre, simbolo, tipo, descripcion } = req.body;
    
    if (!nombre || !simbolo) {
        return res.status(400).json({ error: 'Nombre y símbolo son obligatorios' });
    }
    
    const sql = 'INSERT INTO medidas (nombre, simbolo, tipo, descripcion) VALUES (?, ?, ?, ?)';
    
    db.query(sql, [nombre.trim(), simbolo.trim(), tipo, descripcion], (err, result) => {
        if (err) {
            console.error('Error creando medida:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe una medida con ese símbolo' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            id: result.insertId, 
            message: 'Medida registrada exitosamente' 
        });
    });
});

app.delete('/api/medidas/:id', (req, res) => {
    const { id } = req.params;

    db.query('UPDATE medidas SET activo = FALSE WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error eliminando medida:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Medida no encontrada' });
        }

        res.json({ message: 'Medida eliminada exitosamente' });
    });
});

// Almacenes/Warehouses
app.get('/api/almacenes', (req, res) => {
    db.query('SELECT * FROM almacenes WHERE activo = TRUE ORDER BY nombre', (err, results) => {
        if (err) {
            console.error('Error obteniendo almacenes:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/almacenes', (req, res) => {
    const { nombre, ubicacion, descripcion } = req.body;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: 'El nombre del almacén es obligatorio' });
    }

    const sql = 'INSERT INTO almacenes (nombre, ubicacion, descripcion) VALUES (?, ?, ?)';

    db.query(sql, [nombre.trim(), ubicacion, descripcion], (err, result) => {
        if (err) {
            console.error('Error creando almacén:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Almacén registrado exitosamente',
            almacen: { id: result.insertId, nombre: nombre.trim() }
        });
    });
});

app.put('/api/almacenes/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion, descripcion } = req.body;

    const sql = 'UPDATE almacenes SET nombre = ?, ubicacion = ?, descripcion = ? WHERE id = ?';

    db.query(sql, [nombre, ubicacion, descripcion, id], (err, result) => {
        if (err) {
            console.error('Error actualizando almacén:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Almacén no encontrado' });
        }

        res.json({ message: 'Almacén actualizado exitosamente' });
    });
});

app.delete('/api/almacenes/:id', (req, res) => {
    const { id } = req.params;

    db.query('UPDATE almacenes SET activo = FALSE WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error eliminando almacén:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Almacén no encontrado' });
        }

        res.json({ message: 'Almacén eliminado exitosamente' });
    });
});

// Productos
app.get('/api/productos', (req, res) => {
    const sql = `
        SELECT
            p.id,
            p.nombre,
            p.codigo,
            p.barcode,
            p.categoria,
            p.medida_simbolo,
            m.nombre as medida_nombre,
            p.descripcion,
            COALESCE(SUM(sa.cantidad), 0) as stock_actual,
            p.stock_minimo,
            p.precio_referencia,
            CASE
                WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo THEN 'BAJO'
                WHEN COALESCE(SUM(sa.cantidad), 0) <= p.stock_minimo * 1.5 THEN 'MEDIO'
                ELSE 'OK'
            END as estado_stock,
            p.tipo_producto_id,
            tp.nombre as tipo_producto_nombre,
            p.cuenta_contable_id,
            cc.nombre as cuenta_contable_nombre,
            cc.codigo as cuenta_contable_codigo,
            p.tipo_iva_id,
            ti.porcentaje as tipo_iva_porcentaje,
            ti.nombre as tipo_iva_nombre,
            p.centro_coste_id,
            cco.nombre as centro_coste_nombre,
            p.activo,
            p.fecha_registro
        FROM productos p
        JOIN medidas m ON p.medida_simbolo = m.simbolo
        LEFT JOIN stock_almacen sa ON p.id = sa.producto_id
        LEFT JOIN tipo_producto tp ON p.tipo_producto_id = tp.id
        LEFT JOIN cuenta_contable cc ON p.cuenta_contable_id = cc.id
        LEFT JOIN tipo_iva ti ON p.tipo_iva_id = ti.id
        LEFT JOIN centro_coste cco ON p.centro_coste_id = cco.id
        WHERE p.activo = TRUE
        GROUP BY p.id, p.nombre, p.codigo, p.barcode, p.categoria, p.medida_simbolo, m.nombre, p.descripcion, p.stock_minimo, p.precio_referencia, p.tipo_producto_id, tp.nombre, p.cuenta_contable_id, cc.nombre, cc.codigo, p.tipo_iva_id, ti.porcentaje, ti.nombre, p.centro_coste_id, cco.nombre, p.activo, p.fecha_registro
        ORDER BY p.nombre
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo productos:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/productos', (req, res) => {
    const { nombre, codigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia, stock_minimo, tipo_producto_id, cuenta_contable_id, tipo_iva_id, centro_coste_id } = req.body;

    if (!nombre || !medida_simbolo) {
        return res.status(400).json({ error: 'Nombre y unidad de medida son obligatorios' });
    }

    const finalCodigo = codigo || `PROD-${Date.now()}`;

    const sql = `INSERT INTO productos (nombre, codigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia, stock_minimo, tipo_producto_id, cuenta_contable_id, tipo_iva_id, centro_coste_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [nombre.trim(), finalCodigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia || 0, stock_minimo || 0, tipo_producto_id || null, cuenta_contable_id || null, tipo_iva_id || null, centro_coste_id || null], (err, result) => {
        if (err) {
            console.error('Error creando producto:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un producto con ese código o barcode' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Producto registrado exitosamente',
            producto: { id: result.insertId, nombre: nombre.trim(), codigo: finalCodigo, barcode: barcode }
        });
    });
});

app.put('/api/productos/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, codigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia, stock_minimo, tipo_producto_id, cuenta_contable_id, tipo_iva_id, centro_coste_id } = req.body;

    if (!nombre || !medida_simbolo) {
        return res.status(400).json({ error: 'Nombre y unidad de medida son obligatorios' });
    }

    const sql = `UPDATE productos SET
                 nombre = ?, codigo = ?, barcode = ?, categoria = ?, medida_simbolo = ?,
                 descripcion = ?, precio_referencia = ?, stock_minimo = ?,
                 tipo_producto_id = ?, cuenta_contable_id = ?, tipo_iva_id = ?, centro_coste_id = ?
                 WHERE id = ?`;

    db.query(sql, [nombre.trim(), codigo, barcode, categoria, medida_simbolo, descripcion, precio_referencia || 0, stock_minimo || 0, tipo_producto_id || null, cuenta_contable_id || null, tipo_iva_id || null, centro_coste_id || null, id], (err, result) => {
        if (err) {
            console.error('Error actualizando producto:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un producto con ese código o barcode' });
            }
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto actualizado exitosamente' });
    });
});

app.delete('/api/productos/:id', (req, res) => {
    const { id } = req.params;

    db.query('UPDATE productos SET activo = FALSE WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error eliminando producto:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto eliminado exitosamente' });
    });
});

// Mapeos
app.get('/api/mapeos', (req, res) => {
    const sql = `
        SELECT * FROM vista_mapeos_completos
        ORDER BY proveedor_nombre, nombre_proveedor
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo mapeos:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/mapeos', (req, res) => {
    const { proveedor_id, producto_id, nombre_proveedor, codigo_proveedor, factor_conversion, notas } = req.body;
    
    if (!proveedor_id || !producto_id || !nombre_proveedor) {
        return res.status(400).json({ error: 'Proveedor, producto y nombre del proveedor son obligatorios' });
    }
    
    const sql = `INSERT INTO mapeos (proveedor_id, producto_id, nombre_proveedor, codigo_proveedor, factor_conversion, notas) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.query(sql, [proveedor_id, producto_id, nombre_proveedor.trim(), codigo_proveedor, factor_conversion || 1, notas], (err, result) => {
        if (err) {
            console.error('Error creando mapeo:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un mapeo para ese proveedor con ese nombre de producto' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ 
            id: result.insertId, 
            message: 'Mapeo creado exitosamente' 
        });
    });
});

app.delete('/api/mapeos/:id', (req, res) => {
    const { id } = req.params;

    db.query('UPDATE mapeos SET activo = FALSE WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error('Error eliminando mapeo:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Mapeo no encontrado' });
        }

        res.json({ message: 'Mapeo eliminado exitosamente' });
    });
});

// Procesar archivos Excel/CSV de proveedores
app.post('/api/mapeos/procesar-archivo-proveedor', upload.single('archivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { proveedor_id } = req.body;

    if (!proveedor_id) {
        return res.status(400).json({ error: 'Proveedor ID es requerido' });
    }

    try {
        // Leer el archivo Excel/CSV
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Procesar y estandarizar los datos según las nuevas columnas
        const productosEstandarizados = jsonData.map((row, index) => {
            // Leer las nuevas columnas especificadas
            const codigo = row.codigo || row.Codigo || row.código || row.Código || '';
            const descripcion = row.descripcion || row.Descripcion || row.descripción || row.Descripción || '';
            const cantidad = parseFloat(row.cantidad || row.Cantidad || 0);
            const unidadMedida = row.unidad_medida || row.unidad_medida || row.Unidad_Medida || row.unidad || row.Unidad || '';
            const precio = parseFloat(row.precio || row.Precio || 0);
            const iva = parseFloat(row.iva || row.IVA || row.Iva || 0);

            // Estandarizar el producto
            const productoEstandarizado = estandarizarProductoProveedor({
                nombre: descripcion,
                codigo: codigo,
                unidad: unidadMedida,
                precio: precio,
                cantidad: cantidad,
                iva: iva
            });

            return {
                id: index + 1,
                proveedor_id: parseInt(proveedor_id),
                nombre_proveedor_original: descripcion,
                codigo_proveedor: codigo,
                unidad_proveedor: unidadMedida,
                precio_proveedor: precio,
                cantidad_proveedor: cantidad,
                iva_proveedor: iva,
                nombre_estandarizado: productoEstandarizado.nombre,
                unidad_estandarizada: productoEstandarizado.unidad,
                producto_interno_id: null,
                producto_interno_nombre: null,
                estado_mapping: 'pendiente'
            };
        }).filter(p => p.nombre_proveedor_original.trim() !== '');

        // Generar session ID único
        const sessionId = Date.now().toString();

        // Limpiar archivo temporal
        fs.unlinkSync(req.file.path);

        if (productosEstandarizados.length === 0) {
            return res.status(400).json({ error: 'No se encontraron productos válidos en el archivo' });
        }

        res.json({
            productos: productosEstandarizados,
            session_id: sessionId,
            total: productosEstandarizados.length,
            proveedor_id: proveedor_id
        });

    } catch (error) {
        console.error('Error processing file:', error);
        // Limpiar archivo si existe
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Error procesando archivo' });
    }
});

// Guardar mapeos de archivo
app.post('/api/mapeos/guardar-archivo', (req, res) => {
    const { session_id, mapeos } = req.body;

    if (!session_id || !mapeos || mapeos.length === 0) {
        return res.status(400).json({ error: 'Datos de sesión y mapeos requeridos' });
    }

    // Filtrar mapeos válidos (que tienen producto_interno_id asignado)
    const mapeosValidos = mapeos.filter(m => m.producto_interno_id);

    if (mapeosValidos.length === 0) {
        return res.status(400).json({ error: 'No hay mapeos válidos para guardar' });
    }

    const sqlMapeo = `INSERT INTO mapeos (proveedor_id, producto_id, nombre_proveedor, codigo_proveedor, precio_ultima_compra, fecha_ultima_compra)
                      VALUES (?, ?, ?, ?, ?, CURDATE())
                      ON DUPLICATE KEY UPDATE
                      precio_ultima_compra = VALUES(precio_ultima_compra),
                      fecha_ultima_compra = CURDATE()`;

    const promises = mapeosValidos.map(mapeo => {
        return new Promise((resolve, reject) => {
            db.query(sqlMapeo, [
                mapeo.proveedor_id,
                mapeo.producto_interno_id,
                mapeo.nombre_proveedor_original,
                mapeo.codigo_proveedor || null,
                mapeo.precio_proveedor || null
            ], (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    });

    Promise.all(promises)
        .then(results => {
            const creados = results.filter(r => r.insertId).length;
            const actualizados = results.length - creados;

            res.json({
                message: 'Mapeos consolidados guardados exitosamente',
                creados: creados,
                actualizados: actualizados,
                total: results.length
            });
        })
        .catch(err => {
            console.error('Error guardando mapeos consolidados:', err);
            res.status(500).json({ error: err.message });
        });
});

// Obtener lista consolidada de productos con precios por proveedor
app.get('/api/productos/consolidados', (req, res) => {
    const sql = `
        SELECT
            p.id as producto_interno_id,
            p.nombre as producto_interno,
            p.codigo as codigo_interno,
            p.medida_simbolo as unidad_interna,
            GROUP_CONCAT(
                DISTINCT CONCAT(
                    '{"proveedor_id":', pr.id,
                    ',"proveedor_nombre":"', pr.nombre, '"',
                    ',"codigo_proveedor":"', COALESCE(m.codigo_proveedor, ''), '"',
                    ',"precio_proveedor":', COALESCE(m.precio_ultima_compra, 0),
                    ',"nombre_proveedor":"', m.nombre_proveedor, '"',
                    ',"fecha_ultima_compra":"', COALESCE(m.fecha_ultima_compra, ''), '"}'
                )
                SEPARATOR '|'
            ) as proveedores_info
        FROM productos p
        LEFT JOIN mapeos m ON p.id = m.producto_id AND m.activo = TRUE
        LEFT JOIN proveedores pr ON m.proveedor_id = pr.id AND pr.activo = TRUE
        WHERE p.activo = TRUE
        GROUP BY p.id, p.nombre, p.codigo, p.medida_simbolo
        ORDER BY p.nombre
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo productos consolidados:', err);
            return res.status(500).json({ error: err.message });
        }

        // Procesar los resultados para formatear la información de proveedores
        const productosConsolidados = results.map(row => {
            let proveedores = [];
            if (row.proveedores_info) {
                proveedores = row.proveedores_info.split('|').map(info => {
                    try {
                        return JSON.parse(info);
                    } catch (e) {
                        return null;
                    }
                }).filter(p => p !== null);
            }

            return {
                producto_interno_id: row.producto_interno_id,
                producto_interno: row.producto_interno,
                codigo_interno: row.codigo_interno,
                unidad_interna: row.unidad_interna,
                proveedores: proveedores
            };
        });

        res.json(productosConsolidados);
    });
});

// Movimientos de Stock
app.get('/api/stock/movimientos', (req, res) => {
    const sql = `
        SELECT m.*, p.nombre as producto_nombre, p.codigo as producto_codigo,
               pr.nombre as proveedor_nombre,
               ao.nombre as almacen_origen_nombre,
               ad.nombre as almacen_destino_nombre
        FROM movimientos_stock m
        JOIN productos p ON m.producto_id = p.id
        LEFT JOIN proveedores pr ON m.proveedor_id = pr.id
        LEFT JOIN almacenes ao ON m.almacen_origen_id = ao.id
        LEFT JOIN almacenes ad ON m.almacen_destino_id = ad.id
        ORDER BY m.fecha_movimiento DESC
        LIMIT 50
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo movimientos:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/stock/movimiento', (req, res) => {
    const { producto_id, tipo_movimiento, cantidad, precio_unitario, almacen_origen_id, almacen_destino_id, proveedor_id, motivo, referencia, notas } = req.body;

    if (!producto_id || !tipo_movimiento || !cantidad) {
        return res.status(400).json({ error: 'Producto, tipo de movimiento y cantidad son obligatorios' });
    }

    // Validaciones específicas por tipo de movimiento
    if (tipo_movimiento === 'transferencia' && (!almacen_origen_id || !almacen_destino_id)) {
        return res.status(400).json({ error: 'Para transferencias se requieren almacén origen y destino' });
    }

    if ((tipo_movimiento === 'entrada' || tipo_movimiento === 'ajuste') && !almacen_destino_id) {
        return res.status(400).json({ error: 'Para entradas o ajustes se requiere almacén destino' });
    }

    if (tipo_movimiento === 'salida' && !almacen_origen_id) {
        return res.status(400).json({ error: 'Para salidas se requiere almacén origen' });
    }

    const sql = `INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, precio_unitario, almacen_origen_id, almacen_destino_id, proveedor_id, motivo, referencia, notas)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [producto_id, tipo_movimiento, cantidad, precio_unitario || 0, almacen_origen_id || null, almacen_destino_id || null, proveedor_id || null, motivo, referencia, notas], (err, result) => {
        if (err) {
            console.error('Error registrando movimiento:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Movimiento de stock registrado exitosamente'
        });
    });
});

// Órdenes de Compra
app.get('/api/ordenes-compra', (req, res) => {
    const sql = `
        SELECT oc.*, p.nombre as proveedor_nombre
        FROM ordenes_compra oc
        JOIN proveedores p ON oc.proveedor_id = p.id
        ORDER BY oc.fecha_creacion DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo órdenes de compra:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.get('/api/ordenes-compra/:id', (req, res) => {
    const { id } = req.params;

    const sqlOrden = `
        SELECT oc.*, p.nombre as proveedor_nombre, p.email as proveedor_email
        FROM ordenes_compra oc
        JOIN proveedores p ON oc.proveedor_id = p.id
        WHERE oc.id = ?
    `;

    const sqlDetalles = `
        SELECT ocd.*, m.nombre_proveedor, m.codigo_proveedor, pr.nombre as producto_nombre, pr.codigo as producto_codigo
        FROM ordenes_compra_detalle ocd
        JOIN mapeos m ON ocd.mapeo_id = m.id
        JOIN productos pr ON m.producto_id = pr.id
        WHERE ocd.orden_compra_id = ?
    `;

    db.query(sqlOrden, [id], (err, orden) => {
        if (err) {
            console.error('Error obteniendo orden de compra:', err);
            return res.status(500).json({ error: err.message });
        }

        if (orden.length === 0) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        db.query(sqlDetalles, [id], (err, detalles) => {
            if (err) {
                console.error('Error obteniendo detalles de orden:', err);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                ...orden[0],
                detalles: detalles
            });
        });
    });
});

app.post('/api/ordenes-compra', (req, res) => {
    const { proveedor_id, fecha_esperada_recepcion, detalles, notas } = req.body;

    if (!proveedor_id || !detalles || detalles.length === 0) {
        return res.status(400).json({ error: 'Proveedor y detalles son obligatorios' });
    }

    const numeroOrden = `OC-${Date.now()}`;
    const fechaCreacion = new Date().toISOString().split('T')[0];

    const sqlOrden = `INSERT INTO ordenes_compra (numero_orden, proveedor_id, fecha_creacion, fecha_esperada_recepcion, notas)
                      VALUES (?, ?, ?, ?, ?)`;

    db.query(sqlOrden, [numeroOrden, proveedor_id, fechaCreacion, fecha_esperada_recepcion, notas], (err, result) => {
        if (err) {
            console.error('Error creando orden de compra:', err);
            return res.status(500).json({ error: err.message });
        }

        const ordenId = result.insertId;
        let total = 0;

        // Insertar detalles
        const sqlDetalle = `INSERT INTO ordenes_compra_detalle (orden_compra_id, mapeo_id, cantidad_solicitada, precio_unitario)
                           VALUES (?, ?, ?, ?)`;

        const promises = detalles.map(detalle => {
            total += detalle.cantidad * detalle.precio_unitario;
            return new Promise((resolve, reject) => {
                db.query(sqlDetalle, [ordenId, detalle.mapeo_id, detalle.cantidad, detalle.precio_unitario], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                // Actualizar totales
                const sqlUpdate = 'UPDATE ordenes_compra SET subtotal = ?, total = ? WHERE id = ?';
                db.query(sqlUpdate, [total, total, ordenId], (err) => {
                    if (err) {
                        console.error('Error actualizando totales:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    res.json({
                        id: ordenId,
                        numero_orden: numeroOrden,
                        message: 'Orden de compra creada exitosamente'
                    });
                });
            })
            .catch(err => {
                console.error('Error insertando detalles:', err);
                res.status(500).json({ error: err.message });
            });
    });
});

app.put('/api/ordenes-compra/:id/estado', (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;

    const sql = 'UPDATE ordenes_compra SET estado = ? WHERE id = ?';

    db.query(sql, [estado, id], (err, result) => {
        if (err) {
            console.error('Error actualizando estado de orden:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }

        res.json({ message: 'Estado de orden actualizado exitosamente' });
    });
});

// Endpoint para obtener precios más baratos por producto
app.get('/api/precios-mas-baratos', (req, res) => {
    const sql = `
        SELECT
            p.id as producto_id,
            p.nombre as producto_nombre,
            p.codigo as producto_codigo,
            m.nombre_proveedor,
            m.precio_ultima_compra,
            pr.nombre as proveedor_nombre,
            ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY m.precio_ultima_compra ASC) as ranking
        FROM productos p
        JOIN mapeos m ON p.id = m.producto_id
        JOIN proveedores pr ON m.proveedor_id = pr.id
        WHERE p.activo = TRUE AND m.activo = TRUE AND pr.activo = TRUE AND m.precio_ultima_compra > 0
        ORDER BY p.nombre, m.precio_ultima_compra
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo precios:', err);
            return res.status(500).json({ error: err.message });
        }

        // Agrupar por producto y tomar el más barato
        const preciosBaratos = {};
        results.forEach(row => {
            if (!preciosBaratos[row.producto_id] || row.precio_ultima_compra < preciosBaratos[row.producto_id].precio) {
                preciosBaratos[row.producto_id] = {
                    producto_id: row.producto_id,
                    producto_nombre: row.producto_nombre,
                    producto_codigo: row.producto_codigo,
                    precio: row.precio_ultima_compra,
                    proveedor: row.proveedor_nombre,
                    nombre_proveedor: row.nombre_proveedor
                };
            }
        });

        res.json(Object.values(preciosBaratos));
    });
});

// Facturas/Invoices
app.get('/api/facturas', (req, res) => {
    const sql = `
        SELECT f.*, p.nombre as proveedor_nombre, oc.numero_orden
        FROM facturas f
        JOIN proveedores p ON f.proveedor_id = p.id
        LEFT JOIN ordenes_compra oc ON f.orden_compra_id = oc.id
        ORDER BY f.fecha_recepcion DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo facturas:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/facturas', (req, res) => {
    const { numero_factura, proveedor_id, orden_compra_id, fecha_emision, detalles, archivo_adjunto, email_origen } = req.body;

    if (!numero_factura || !proveedor_id || !detalles || detalles.length === 0) {
        return res.status(400).json({ error: 'Número de factura, proveedor y detalles son obligatorios' });
    }

    const fechaRecepcion = new Date().toISOString().split('T')[0];
    const fechaEmail = email_origen ? new Date().toISOString() : null;

    let total = 0;
    detalles.forEach(d => total += d.cantidad * d.precio_unitario);

    const sqlFactura = `INSERT INTO facturas (numero_factura, proveedor_id, orden_compra_id, fecha_emision, fecha_recepcion, fecha_email, email_origen, archivo_adjunto, total)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sqlFactura, [numero_factura, proveedor_id, orden_compra_id || null, fecha_emision, fechaRecepcion, fechaEmail, email_origen, archivo_adjunto, total], (err, result) => {
        if (err) {
            console.error('Error creando factura:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe una factura con ese número' });
            }
            return res.status(500).json({ error: err.message });
        }

        const facturaId = result.insertId;

        // Insertar detalles y verificar discrepancias
        const sqlDetalle = `INSERT INTO facturas_detalle (factura_id, mapeo_id, cantidad, precio_unitario, cantidad_orden, precio_orden)
                           VALUES (?, ?, ?, ?, ?, ?)`;

        // Obtener datos de la orden si existe
        let ordenDetalles = {};
        if (orden_compra_id) {
            db.query('SELECT mapeo_id, cantidad_solicitada, precio_unitario FROM ordenes_compra_detalle WHERE orden_compra_id = ?', [orden_compra_id], (err, ordenResults) => {
                if (!err) {
                    ordenResults.forEach(d => {
                        ordenDetalles[d.mapeo_id] = { cantidad: d.cantidad_solicitada, precio: d.precio_unitario };
                    });
                }
                insertDetalles();
            });
        } else {
            insertDetalles();
        }

        function insertDetalles() {
            const promises = detalles.map(detalle => {
                const ordenData = ordenDetalles[detalle.mapeo_id] || { cantidad: 0, precio: 0 };
                const discrepanciaCantidad = detalle.cantidad !== ordenData.cantidad;
                const discrepanciaPrecio = detalle.precio_unitario !== ordenData.precio;

                return new Promise((resolve, reject) => {
                    db.query(sqlDetalle, [facturaId, detalle.mapeo_id, detalle.cantidad, detalle.precio_unitario, ordenData.cantidad, ordenData.precio], (err) => {
                        if (err) reject(err);
                        else resolve({ discrepanciaCantidad, discrepanciaPrecio });
                    });
                });
            });

            Promise.all(promises)
                .then(discrepancias => {
                    const hasDiscrepancias = discrepancias.some(d => d.discrepanciaCantidad || d.discrepanciaPrecio);
                    const estado = hasDiscrepancias ? 'discrepancias' : 'verificada';

                    db.query('UPDATE facturas SET estado = ? WHERE id = ?', [estado, facturaId], (err) => {
                        if (err) {
                            console.error('Error actualizando estado de factura:', err);
                            return res.status(500).json({ error: err.message });
                        }

                        res.json({
                            id: facturaId,
                            message: 'Factura registrada exitosamente',
                            estado: estado,
                            discrepancias: hasDiscrepancias
                        });
                    });
                })
                .catch(err => {
                    console.error('Error insertando detalles de factura:', err);
                    res.status(500).json({ error: err.message });
                });
        }
    });
});

app.put('/api/facturas/:id/aprobar', (req, res) => {
    const { id } = req.params;
    const { almacen_id } = req.body;

    if (!almacen_id) {
        return res.status(400).json({ error: 'Almacén es obligatorio para aprobar la factura' });
    }

    // Obtener detalles de la factura
    const sqlDetalles = `
        SELECT fd.*, m.producto_id
        FROM facturas_detalle fd
        JOIN mapeos m ON fd.mapeo_id = m.id
        WHERE fd.factura_id = ?
    `;

    db.query(sqlDetalles, [id], (err, detalles) => {
        if (err) {
            console.error('Error obteniendo detalles de factura:', err);
            return res.status(500).json({ error: err.message });
        }

        // Registrar movimientos de entrada
        const sqlMovimiento = `INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, precio_unitario, almacen_destino_id, proveedor_id, referencia)
                              VALUES (?, 'entrada', ?, ?, ?, (SELECT proveedor_id FROM facturas WHERE id = ?), ?)`;

        const promises = detalles.map(detalle => {
            return new Promise((resolve, reject) => {
                db.query(sqlMovimiento, [detalle.producto_id, detalle.cantidad, detalle.precio_unitario, almacen_id, id, `Factura ${id}`], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                // Actualizar estado de factura
                db.query('UPDATE facturas SET estado = "aprobada", usuario_procesamiento = "sistema" WHERE id = ?', [id], (err) => {
                    if (err) {
                        console.error('Error aprobando factura:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    // Actualizar precios en mapeos
                    const sqlUpdatePrecio = `UPDATE mapeos SET precio_ultima_compra = ?, fecha_ultima_compra = CURDATE()
                                            WHERE id = ? AND (precio_ultima_compra IS NULL OR precio_ultima_compra != ?)`;

                    const precioPromises = detalles.map(detalle => {
                        return new Promise((resolve, reject) => {
                            db.query(sqlUpdatePrecio, [detalle.precio_unitario, detalle.mapeo_id, detalle.precio_unitario], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    });

                    Promise.all(precioPromises)
                        .then(() => {
                            res.json({ message: 'Factura aprobada y stock actualizado exitosamente' });
                        })
                        .catch(err => {
                            console.error('Error actualizando precios:', err);
                            res.status(500).json({ error: err.message });
                        });
                });
            })
            .catch(err => {
                console.error('Error registrando movimientos:', err);
                res.status(500).json({ error: err.message });
            });
    });
});

// Stock por almacén
app.get('/api/stock/almacen/:almacen_id', (req, res) => {
    const { almacen_id } = req.params;

    const sql = `
        SELECT sa.*, p.nombre as producto_nombre, p.codigo as producto_codigo, p.barcode, p.medida_simbolo
        FROM stock_almacen sa
        JOIN productos p ON sa.producto_id = p.id
        WHERE sa.almacen_id = ? AND p.activo = TRUE
        ORDER BY p.nombre
    `;

    db.query(sql, [almacen_id], (err, results) => {
        if (err) {
            console.error('Error obteniendo stock de almacén:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Transferencias entre almacenes
app.post('/api/stock/transferencia', (req, res) => {
    const { producto_id, cantidad, almacen_origen_id, almacen_destino_id, notas } = req.body;

    if (!producto_id || !cantidad || !almacen_origen_id || !almacen_destino_id) {
        return res.status(400).json({ error: 'Producto, cantidad, almacén origen y destino son obligatorios' });
    }

    if (almacen_origen_id === almacen_destino_id) {
        return res.status(400).json({ error: 'El almacén origen y destino deben ser diferentes' });
    }

    // Verificar stock disponible
    db.query('SELECT cantidad FROM stock_almacen WHERE almacen_id = ? AND producto_id = ?', [almacen_origen_id, producto_id], (err, results) => {
        if (err) {
            console.error('Error verificando stock:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0 || results[0].cantidad < cantidad) {
            return res.status(400).json({ error: 'Stock insuficiente en almacén origen' });
        }

        // Registrar movimiento de transferencia
        const sql = `INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, almacen_origen_id, almacen_destino_id, notas)
                     VALUES (?, 'transferencia', ?, ?, ?, ?)`;

        db.query(sql, [producto_id, cantidad, almacen_origen_id, almacen_destino_id, notas], (err, result) => {
            if (err) {
                console.error('Error registrando transferencia:', err);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                id: result.insertId,
                message: 'Transferencia realizada exitosamente'
            });
        });
    });
});

// Procesamiento de emails para facturas
const nodemailer = require('nodemailer');

// Configuración de email (ajustar según necesidades)
const emailTransporter = nodemailer.createTransport({
    service: 'gmail', // o tu proveedor de email
    auth: {
        user: process.env.EMAIL_USER || 'tu-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'tu-password'
    }
});

// Endpoint para procesar email con factura adjunta
app.post('/api/email/process-invoice', upload.single('attachment'), (req, res) => {
    const { from, subject, body } = req.body;
    const attachment = req.file;

    if (!attachment) {
        return res.status(400).json({ error: 'Adjunto de factura requerido' });
    }

    // Registrar en log de emails
    const sqlLog = `INSERT INTO email_logs (remitente, asunto, archivo_adjunto)
                    VALUES (?, ?, ?)`;

    db.query(sqlLog, [from, subject, attachment.path], (err, result) => {
        if (err) {
            console.error('Error registrando email:', err);
            return res.status(500).json({ error: err.message });
        }

        // Aquí iría la lógica para procesar el PDF de la factura
        // Por ahora, solo registramos que llegó
        res.json({
            id: result.insertId,
            message: 'Email procesado exitosamente. Pendiente de revisión manual.',
            attachment_path: attachment.path
        });
    });
});

// Endpoint para obtener emails pendientes de procesar
app.get('/api/email/pending', (req, res) => {
    const sql = 'SELECT * FROM email_logs WHERE procesado = FALSE ORDER BY fecha_recepcion DESC';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo emails pendientes:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// ==================== PROCESAMIENTO DE ALBARANES ====================

// Obtener albaranes de proveedores
app.get('/api/albaranes-proveedores', (req, res) => {
    const sql = `
        SELECT ap.*, p.nombre as proveedor_nombre, oc.numero_orden
        FROM albaranes_proveedores ap
        JOIN proveedores p ON ap.proveedor_id = p.id
        LEFT JOIN ordenes_compra oc ON ap.orden_compra_id = oc.id
        ORDER BY ap.fecha_recepcion DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo albaranes:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Crear albarán de proveedor
app.post('/api/albaranes-proveedores', (req, res) => {
    const { numero_albaran, proveedor_id, orden_compra_id, fecha_recepcion, fecha_entrega, items } = req.body;

    if (!numero_albaran || !proveedor_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Número de albarán, proveedor e items son obligatorios' });
    }

    const sqlAlbaran = `INSERT INTO albaranes_proveedores (numero_albaran, proveedor_id, orden_compra_id, fecha_recepcion, fecha_entrega, total_items)
                        VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(sqlAlbaran, [numero_albaran, proveedor_id, orden_compra_id || null, fecha_recepcion, fecha_entrega, items.length], (err, result) => {
        if (err) {
            console.error('Error creando albarán:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un albarán con ese número' });
            }
            return res.status(500).json({ error: err.message });
        }

        const albaranId = result.insertId;

        // Insertar items del albarán
        const sqlItem = `INSERT INTO albaranes_items (albaran_id, nombre_proveedor_crudo, codigo_proveedor_crudo, cantidad_cruda, precio_unitario_crudo)
                        VALUES (?, ?, ?, ?, ?)`;

        const promises = items.map(item => {
            return new Promise((resolve, reject) => {
                db.query(sqlItem, [albaranId, item.nombre_proveedor, item.codigo_proveedor, item.cantidad, item.precio_unitario], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                // Iniciar procesamiento automático
                procesarItemsAlbaran(albaranId);

                res.json({
                    id: albaranId,
                    message: 'Albarán registrado exitosamente. Procesamiento automático iniciado.',
                    numero_albaran: numero_albaran
                });
            })
            .catch(err => {
                console.error('Error insertando items del albarán:', err);
                res.status(500).json({ error: err.message });
            });
    });
});

// Obtener items de un albarán
app.get('/api/albaranes-proveedores/:id/items', (req, res) => {
    const { id } = req.params;

    const sql = `
        SELECT ai.*, p.nombre as producto_match, p.codigo as codigo_match,
               m.nombre_proveedor, m.factor_conversion
        FROM albaranes_items ai
        LEFT JOIN productos p ON ai.producto_id = p.id
        LEFT JOIN mapeos m ON ai.mapeo_id = m.id
        WHERE ai.albaran_id = ?
        ORDER BY ai.id
    `;

    db.query(sql, [id], (err, results) => {
        if (err) {
            console.error('Error obteniendo items del albarán:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Procesar albarán automáticamente
app.post('/api/albaranes-proveedores/:id/process', (req, res) => {
    const { id } = req.params;

    procesarItemsAlbaran(parseInt(id))
        .then(result => {
            res.json({
                message: 'Procesamiento completado',
                items_procesados: result.procesados,
                total_items: result.total
            });
        })
        .catch(err => {
            console.error('Error procesando albarán:', err);
            res.status(500).json({ error: err.message });
        });
});

// Matching manual de item
app.put('/api/albaranes-items/:id/match', (req, res) => {
    const { id } = req.params;
    const { producto_id, mapeo_id, cantidad_final, precio_unitario_final, almacen_id } = req.body;

    const sql = `UPDATE albaranes_items
                 SET producto_id = ?, mapeo_id = ?, cantidad_final = ?,
                     precio_unitario_final = ?, almacen_id = ?, estado = 'manual_match',
                     procesado = TRUE
                 WHERE id = ?`;

    db.query(sql, [producto_id, mapeo_id, cantidad_final, precio_unitario_final, almacen_id, id], (err, result) => {
        if (err) {
            console.error('Error actualizando matching:', err);
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Item no encontrado' });
        }

        res.json({ message: 'Matching actualizado exitosamente' });
    });
});

// Completar albarán y actualizar inventario
app.post('/api/albaranes-proveedores/:id/complete', (req, res) => {
    const { id } = req.params;

    // Obtener items procesados
    const sqlItems = `
        SELECT * FROM albaranes_items
        WHERE albaran_id = ? AND procesado = TRUE
        AND producto_id IS NOT NULL
    `;

    db.query(sqlItems, [id], (err, items) => {
        if (err) {
            console.error('Error obteniendo items procesados:', err);
            return res.status(500).json({ error: err.message });
        }

        // Registrar movimientos de entrada
        const sqlMovimiento = `INSERT INTO movimientos_stock (producto_id, tipo_movimiento, cantidad, precio_unitario, almacen_destino_id, proveedor_id, referencia)
                              VALUES (?, 'entrada', ?, ?, ?, (SELECT proveedor_id FROM albaranes_proveedores WHERE id = ?), ?)`;

        const promises = items.map(item => {
            return new Promise((resolve, reject) => {
                db.query(sqlMovimiento, [item.producto_id, item.cantidad_final, item.precio_unitario_final, item.almacen_id || 1, id, `Albarán ${id}`], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        Promise.all(promises)
            .then(() => {
                // Actualizar estado del albarán
                const sqlUpdate = 'UPDATE albaranes_proveedores SET estado = "completado", fecha_procesamiento = NOW(), usuario_procesamiento = "sistema" WHERE id = ?';
                db.query(sqlUpdate, [id], (err) => {
                    if (err) {
                        console.error('Error completando albarán:', err);
                        return res.status(500).json({ error: err.message });
                    }

                    // Actualizar precios en mapeos
                    const sqlUpdatePrecio = `UPDATE mapeos SET precio_ultima_compra = ?, fecha_ultima_compra = CURDATE()
                                            WHERE id = ? AND (precio_ultima_compra IS NULL OR precio_ultima_compra != ?)`;

                    const precioPromises = items.map(item => {
                        return new Promise((resolve, reject) => {
                            db.query(sqlUpdatePrecio, [item.precio_unitario_final, item.mapeo_id, item.precio_unitario_final], (err) => {
                                if (err) reject(err);
                                else resolve();
                            });
                        });
                    });

                    Promise.all(precioPromises)
                        .then(() => {
                            res.json({
                                message: 'Albarán completado e inventario actualizado exitosamente',
                                items_procesados: items.length
                            });
                        })
                        .catch(err => {
                            console.error('Error actualizando precios:', err);
                            res.status(500).json({ error: err.message });
                        });
                });
            })
            .catch(err => {
                console.error('Error registrando movimientos:', err);
                res.status(500).json({ error: err.message });
            });
    });
});

// ==================== TABLAS CONTABLES ====================

// Tipos de producto
app.get('/api/tipos-producto', (req, res) => {
    db.query('SELECT * FROM tipo_producto WHERE activo = TRUE ORDER BY nombre', (err, results) => {
        if (err) {
            console.error('Error obteniendo tipos de producto:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/tipos-producto', (req, res) => {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre del tipo de producto es obligatorio' });
    }

    const sql = 'INSERT INTO tipo_producto (nombre, descripcion) VALUES (?, ?)';

    db.query(sql, [nombre.trim(), descripcion], (err, result) => {
        if (err) {
            console.error('Error creando tipo de producto:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un tipo de producto con ese nombre' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Tipo de producto registrado exitosamente'
        });
    });
});

// Cuentas contables
app.get('/api/cuentas-contables', (req, res) => {
    db.query('SELECT * FROM cuenta_contable WHERE activo = TRUE ORDER BY codigo', (err, results) => {
        if (err) {
            console.error('Error obteniendo cuentas contables:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/cuentas-contables', (req, res) => {
    const { codigo, nombre, descripcion } = req.body;

    if (!codigo || !nombre) {
        return res.status(400).json({ error: 'Código y nombre son obligatorios' });
    }

    const sql = 'INSERT INTO cuenta_contable (codigo, nombre, descripcion) VALUES (?, ?, ?)';

    db.query(sql, [codigo.trim(), nombre.trim(), descripcion], (err, result) => {
        if (err) {
            console.error('Error creando cuenta contable:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe una cuenta contable con ese código' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Cuenta contable registrada exitosamente'
        });
    });
});

// Tipos de IVA
app.get('/api/tipos-iva', (req, res) => {
    db.query('SELECT * FROM tipo_iva WHERE activo = TRUE ORDER BY porcentaje', (err, results) => {
        if (err) {
            console.error('Error obteniendo tipos de IVA:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/tipos-iva', (req, res) => {
    const { porcentaje, nombre, descripcion } = req.body;

    if (porcentaje === undefined || porcentaje === null) {
        return res.status(400).json({ error: 'El porcentaje es obligatorio' });
    }

    const sql = 'INSERT INTO tipo_iva (porcentaje, nombre, descripcion) VALUES (?, ?, ?)';

    db.query(sql, [parseFloat(porcentaje), nombre, descripcion], (err, result) => {
        if (err) {
            console.error('Error creando tipo de IVA:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un tipo de IVA con ese porcentaje' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Tipo de IVA registrado exitosamente'
        });
    });
});

// Centros de coste
app.get('/api/centros-coste', (req, res) => {
    db.query('SELECT * FROM centro_coste WHERE activo = TRUE ORDER BY nombre', (err, results) => {
        if (err) {
            console.error('Error obteniendo centros de coste:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

app.post('/api/centros-coste', (req, res) => {
    const { nombre, descripcion } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre del centro de coste es obligatorio' });
    }

    const sql = 'INSERT INTO centro_coste (nombre, descripcion) VALUES (?, ?)';

    db.query(sql, [nombre.trim(), descripcion], (err, result) => {
        if (err) {
            console.error('Error creando centro de coste:', err);
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Ya existe un centro de coste con ese nombre' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Centro de coste registrado exitosamente'
        });
    });
});

// ==================== CONFIGURACIÓN DEL HOTEL ====================

// Obtener configuración del hotel
app.get('/api/configuracion-hotel', (req, res) => {
    const sql = 'SELECT * FROM configuracion_hotel ORDER BY id DESC LIMIT 1';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo configuración del hotel:', err);
            return res.status(500).json({ error: err.message });
        }

        // Si no existe configuración, devolver objeto vacío
        const config = results.length > 0 ? results[0] : {
            id: null,
            nombre_legal: '',
            nombre_social: '',
            direccion: '',
            ciudad: '',
            codigo_postal: '',
            nif: '',
            telefono: '',
            email_contacto: ''
        };

        res.json(config);
    });
});

// Crear/actualizar configuración del hotel
app.post('/api/configuracion-hotel', (req, res) => {
    const { nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto } = req.body;

    // Verificar si ya existe una configuración
    const sqlCheck = 'SELECT id FROM configuracion_hotel ORDER BY id DESC LIMIT 1';

    db.query(sqlCheck, (err, results) => {
        if (err) {
            console.error('Error verificando configuración existente:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
            // Actualizar configuración existente
            const sqlUpdate = `UPDATE configuracion_hotel SET
                              nombre_legal = ?, nombre_social = ?, direccion = ?,
                              ciudad = ?, codigo_postal = ?, nif = ?, telefono = ?, email_contacto = ?
                              WHERE id = ?`;

            db.query(sqlUpdate, [nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto, results[0].id], (err, result) => {
                if (err) {
                    console.error('Error actualizando configuración del hotel:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    id: results[0].id,
                    message: 'Configuración del hotel actualizada exitosamente'
                });
            });
        } else {
            // Crear nueva configuración
            const sqlInsert = `INSERT INTO configuracion_hotel
                              (nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

            db.query(sqlInsert, [nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto], (err, result) => {
                if (err) {
                    console.error('Error creando configuración del hotel:', err);
                    return res.status(500).json({ error: err.message });
                }

                res.json({
                    id: result.insertId,
                    message: 'Configuración del hotel creada exitosamente'
                });
            });
        }
    });
});

// ==================== CONFIGURACIÓN DEL HOTEL ====================

// Obtener configuración del hotel
app.get('/api/configuracion-hotel', (req, res) => {
    const sql = 'SELECT * FROM configuracion_hotel LIMIT 1';

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo configuración del hotel:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            // Devolver configuración por defecto
            return res.json({
                nombre_legal: '',
                nombre_social: '',
                direccion: '',
                ciudad: '',
                codigo_postal: '',
                nif: '',
                telefono: '',
                email_contacto: ''
            });
        }

        res.json(results[0]);
    });
});

// Guardar configuración del hotel
app.post('/api/configuracion-hotel', (req, res) => {
    const { nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto } = req.body;

    const sql = `INSERT INTO configuracion_hotel
                 (nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                 nombre_legal = VALUES(nombre_legal),
                 nombre_social = VALUES(nombre_social),
                 direccion = VALUES(direccion),
                 ciudad = VALUES(ciudad),
                 codigo_postal = VALUES(codigo_postal),
                 nif = VALUES(nif),
                 telefono = VALUES(telefono),
                 email_contacto = VALUES(email_contacto)`;

    db.query(sql, [nombre_legal, nombre_social, direccion, ciudad, codigo_postal, nif, telefono, email_contacto], (err, result) => {
        if (err) {
            console.error('Error guardando configuración del hotel:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Configuración del hotel guardada exitosamente' });
    });
});

// ==================== REGLAS DE NORMALIZACIÓN ====================

// Obtener reglas de normalización
app.get('/api/reglas-normalizacion', (req, res) => {
    const sql = `
        SELECT rn.*, p.nombre as proveedor_nombre
        FROM reglas_normalizacion rn
        LEFT JOIN proveedores p ON rn.proveedor_id = p.id
        WHERE rn.activo = TRUE
        ORDER BY rn.proveedor_id, rn.fecha_registro DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error obteniendo reglas de normalización:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// Crear regla de normalización
app.post('/api/reglas-normalizacion', (req, res) => {
    const { proveedor_id, patron, reemplazo, descripcion } = req.body;

    if (!patron || !reemplazo) {
        return res.status(400).json({ error: 'Patrón y reemplazo son obligatorios' });
    }

    const sql = 'INSERT INTO reglas_normalizacion (proveedor_id, patron, reemplazo, descripcion) VALUES (?, ?, ?, ?)';

    db.query(sql, [proveedor_id || null, patron, reemplazo, descripcion], (err, result) => {
        if (err) {
            console.error('Error creando regla de normalización:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({
            id: result.insertId,
            message: 'Regla de normalización creada exitosamente'
        });
    });
});

// Generación de códigos de barras (simplificada - solo texto por ahora)
app.get('/api/barcode/:code', (req, res) => {
    const { code } = req.params;
    // Por ahora, solo devolver el código como texto
    // En producción, implementar generación real de barcode
    res.json({ code: code, message: 'Barcode generation not implemented yet' });
});

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, '../mobile.html'));
});

app.get('/manifest.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../manifest.json'));
});

// Manejar errores de conexión perdida
db.on('error', (err) => {
    console.error('❌ Error de base de datos:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('🔄 Reintentando conexión...');
        db.connect();
    }
});

// Catch-all para rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log('📊 Dashboard disponible en http://localhost:' + PORT);
    console.log('⚡ API endpoints disponibles:');
    console.log('   GET  /api/dashboard');
    console.log('   CRUD /api/proveedores');
    console.log('   CRUD /api/productos');
    console.log('   CRUD /api/medidas');
    console.log('   CRUD /api/almacenes');
    console.log('   CRUD /api/mapeos');
    console.log('   CRUD /api/ordenes-compra');
    console.log('   CRUD /api/facturas');
    console.log('   CRUD /api/stock/*');
    console.log('   CRUD /api/albaranes-proveedores');
    console.log('   CRUD /api/reglas-normalizacion');
    console.log('   CRUD /api/configuracion-hotel');
    console.log('   CRUD /api/tipos-producto');
    console.log('   CRUD /api/cuentas-contables');
    console.log('   CRUD /api/tipos-iva');
    console.log('   CRUD /api/centros-coste');
    console.log('   GET  /api/precios-mas-baratos');
    console.log('   GET  /api/barcode/:code');
    console.log('   POST /api/email/process-invoice');
});

// ==================== FUNCIONES DE PROCESAMIENTO ====================

// Función para procesar items de albarán automáticamente
async function procesarItemsAlbaran(albaranId) {
    return new Promise((resolve, reject) => {
        // Obtener items sin procesar
        const sqlItems = 'SELECT * FROM albaranes_items WHERE albaran_id = ? AND procesado = FALSE';

        db.query(sqlItems, [albaranId], (err, items) => {
            if (err) {
                return reject(err);
            }

            let procesados = 0;
            const promises = items.map(item => {
                return new Promise((resolveItem) => {
                    // Intentar matching automático
                    encontrarMatchingProducto(item.nombre_proveedor_crudo, item.codigo_proveedor_crudo, albaranId)
                        .then(match => {
                            if (match) {
                                // Actualizar item con matching encontrado
                                const sqlUpdate = `UPDATE albaranes_items
                                                 SET nombre_normalizado = ?, producto_id = ?, mapeo_id = ?,
                                                     confianza_match = ?, cantidad_final = ?, precio_unitario_final = ?,
                                                     estado = 'matched', procesado = TRUE
                                                 WHERE id = ?`;

                                db.query(sqlUpdate, [
                                    match.nombre_normalizado,
                                    match.producto_id,
                                    match.mapeo_id,
                                    match.confianza,
                                    item.cantidad_cruda,
                                    item.precio_unitario_crudo,
                                    item.id
                                ], (err) => {
                                    if (!err) procesados++;
                                    resolveItem();
                                });
                            } else {
                                // Marcar como unmatched para revisión manual
                                const nombreNormalizado = normalizarNombreProducto(item.nombre_proveedor_crudo);
                                const sqlUpdate = `UPDATE albaranes_items
                                                 SET nombre_normalizado = ?, estado = 'unmatched'
                                                 WHERE id = ?`;

                                db.query(sqlUpdate, [nombreNormalizado, item.id], () => {
                                    resolveItem();
                                });
                            }
                        })
                        .catch(() => {
                            resolveItem();
                        });
                });
            });

            Promise.all(promises).then(() => {
                resolve({ procesados, total: items.length });
            });
        });
    });
}

// Función para encontrar matching de productos
async function encontrarMatchingProducto(nombreCrudo, codigoCrudo, albaranId) {
    return new Promise((resolve) => {
        // Obtener proveedor_id del albarán
        const sqlProveedor = 'SELECT proveedor_id FROM albaranes_proveedores WHERE id = ?';
        db.query(sqlProveedor, [albaranId], (err, proveedorResult) => {
            if (err || proveedorResult.length === 0) {
                return resolve(null);
            }

            const proveedorId = proveedorResult[0].proveedor_id;
            const nombreNormalizado = normalizarNombreProducto(nombreCrudo);

            // Buscar en mapeos del proveedor
            const sqlMapeos = `
                SELECT m.*, p.nombre as nombre_producto
                FROM mapeos m
                JOIN productos p ON m.producto_id = p.id
                WHERE m.proveedor_id = ? AND m.activo = TRUE AND p.activo = TRUE
            `;

            db.query(sqlMapeos, [proveedorId], (err, mapeos) => {
                if (err) return resolve(null);

                // Buscar por código exacto primero
                if (codigoCrudo) {
                    const matchCodigo = mapeos.find(m => m.codigo_proveedor === codigoCrudo);
                    if (matchCodigo) {
                        return resolve({
                            producto_id: matchCodigo.producto_id,
                            mapeo_id: matchCodigo.id,
                            nombre_normalizado: nombreNormalizado,
                            confianza: 1.0
                        });
                    }
                }

                // Buscar por similitud de nombre
                const matchesNombre = mapeos.filter(m => {
                    const nombreProveedor = normalizarNombreProducto(m.nombre_proveedor);
                    return nombreProveedor.includes(nombreNormalizado) || nombreNormalizado.includes(nombreProveedor);
                });

                if (matchesNombre.length > 0) {
                    const mejorMatch = matchesNombre[0];
                    return resolve({
                        producto_id: mejorMatch.producto_id,
                        mapeo_id: mejorMatch.id,
                        nombre_normalizado: nombreNormalizado,
                        confianza: 0.8
                    });
                }

                resolve(null);
            });
        });
    });
}

// Función para estandarizar productos de proveedores
function estandarizarProductoProveedor(producto) {
    let nombre = producto.nombre || '';
    let unidad = producto.unidad || '';
    let cantidad = producto.cantidad || 0;
    let precio = producto.precio || 0;
    let iva = producto.iva || 0;

    // Normalizar nombre
    nombre = nombre.toLowerCase().trim();

    // Remover caracteres especiales
    nombre = nombre.replace(/[^\w\s]/g, ' ');

    // Normalizar espacios
    nombre = nombre.replace(/\s+/g, ' ');

    // Remover palabras comunes de unidades del nombre
    const palabrasUnidad = ['kg', 'g', 'l', 'ml', 'unidad', 'unidades', 'caja', 'cajas', 'paquete', 'paquetes', 'docena', 'docenas', 'litro', 'litros', 'gramo', 'gramos', 'kilo', 'kilos'];
    palabrasUnidad.forEach(palabra => {
        const regex = new RegExp(`\\b${palabra}\\b`, 'gi');
        nombre = nombre.replace(regex, '');
    });

    // Estandarizar unidades
    unidad = unidad.toLowerCase().trim();

    // Mapear unidades comunes
    const mapaUnidades = {
        'kg': 'kg',
        'kilo': 'kg',
        'kilos': 'kg',
        'kilogramo': 'kg',
        'kilogramos': 'kg',
        'g': 'g',
        'gramo': 'g',
        'gramos': 'g',
        'l': 'l',
        'litro': 'l',
        'litros': 'l',
        'ml': 'ml',
        'mililitro': 'ml',
        'mililitros': 'ml',
        'unidad': 'unidad',
        'unidades': 'unidad',
        'caja': 'caja',
        'cajas': 'caja',
        'paquete': 'paquete',
        'paquetes': 'paquete',
        'docena': 'docena',
        'docenas': 'docena'
    };

    unidad = mapaUnidades[unidad] || 'unidad';

    return {
        nombre: nombre.trim(),
        unidad: unidad,
        cantidad: cantidad,
        precio: precio,
        iva: iva
    };
}

// Función para normalizar nombres de productos
function normalizarNombreProducto(nombre) {
    if (!nombre) return '';

    let normalizado = nombre
        .toLowerCase()
        .trim();

    // Aplicar reglas de normalización de la base de datos
    // Por simplicidad, aplicamos reglas básicas aquí
    // En producción, cargar las reglas de la BD

    // Remover caracteres especiales y números
    normalizado = normalizado.replace(/[^\w\s]/g, ' ');

    // Normalizar espacios
    normalizado = normalizado.replace(/\s+/g, ' ');

    // Remover palabras comunes
    const palabrasComunes = ['kg', 'g', 'l', 'ml', 'unidad', 'unidades', 'caja', 'cajas', 'paquete', 'paquetes', 'docena', 'docenas'];
    palabrasComunes.forEach(palabra => {
        const regex = new RegExp(`\\b${palabra}\\b`, 'gi');
        normalizado = normalizado.replace(regex, '');
    });

    return normalizado.trim();
}

// Manejo de cierre graceful
process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    db.end();
    process.exit();
});

module.exports = app;
