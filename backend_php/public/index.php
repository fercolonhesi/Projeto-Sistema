<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Include autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Include database and helpers
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/helpers.php';

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$requestUri = $_SERVER['REQUEST_URI'];

// Remove query string
$path = parse_url($requestUri, PHP_URL_PATH);

// Remove base path if needed (assuming backend_php/public is the web root)
$path = str_replace('/backend_php/public', '', $path);

// Parse JSON body for POST/PUT
$input = json_decode(file_get_contents('php://input'), true);

// Route handling
try {
    if ($path === '/api/dashboard' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/dashboard.php';
        handleDashboard();
    } elseif (preg_match('/^\/api\/proveedores(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST', 'PUT', 'DELETE'])) {
        require_once __DIR__ . '/../src/routes/proveedores.php';
        handleProveedores($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/medidas(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST', 'DELETE'])) {
        require_once __DIR__ . '/../src/routes/medidas.php';
        handleMedidas($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/almacenes(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST', 'PUT', 'DELETE'])) {
        require_once __DIR__ . '/../src/routes/almacenes.php';
        handleAlmacenes($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/productos(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST', 'PUT', 'DELETE'])) {
        require_once __DIR__ . '/../src/routes/productos.php';
        handleProductos($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/mapeos(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST', 'DELETE'])) {
        require_once __DIR__ . '/../src/routes/mapeos.php';
        handleMapeos($method, $matches[2] ?? null, $input);
    } elseif ($path === '/api/mapeos/procesar-archivo-proveedor' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/mapeos.php';
        handleProcesarArchivoProveedor($input);
    } elseif ($path === '/api/mapeos/guardar-archivo' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/mapeos.php';
        handleGuardarArchivoMapeos($input);
    } elseif ($path === '/api/productos/consolidados' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/productos.php';
        handleProductosConsolidados();
    } elseif ($path === '/api/stock/movimientos' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/stock.php';
        handleStockMovimientos();
    } elseif ($path === '/api/stock/movimiento' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/stock.php';
        handleStockMovimiento($input);
    } elseif (preg_match('/^\/api\/stock\/almacen\/(\d+)$/', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/stock.php';
        handleStockAlmacen($matches[1]);
    } elseif ($path === '/api/stock/transferencia' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/stock.php';
        handleStockTransferencia($input);
    } elseif (preg_match('/^\/api\/ordenes-compra(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST'])) {
        require_once __DIR__ . '/../src/routes/ordenes_compra.php';
        handleOrdenesCompra($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/ordenes-compra\/(\d+)\/estado$/', $path, $matches) && $method === 'PUT') {
        require_once __DIR__ . '/../src/routes/ordenes_compra.php';
        handleOrdenCompraEstado($matches[1], $input);
    } elseif ($path === '/api/precios-mas-baratos' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/productos.php';
        handlePreciosMasBaratos();
    } elseif (preg_match('/^\/api\/facturas(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST'])) {
        require_once __DIR__ . '/../src/routes/facturas.php';
        handleFacturas($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/facturas\/(\d+)\/aprobar$/', $path, $matches) && $method === 'PUT') {
        require_once __DIR__ . '/../src/routes/facturas.php';
        handleFacturaAprobar($matches[1], $input);
    } elseif (preg_match('/^\/api\/albaranes-proveedores(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST'])) {
        require_once __DIR__ . '/../src/routes/albaranes.php';
        handleAlbaranesProveedores($method, $matches[2] ?? null, $input);
    } elseif (preg_match('/^\/api\/albaranes-proveedores\/(\d+)\/items$/', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/albaranes.php';
        handleAlbaranItems($matches[1]);
    } elseif (preg_match('/^\/api\/albaranes-proveedores\/(\d+)\/process$/', $path, $matches) && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/albaranes.php';
        handleAlbaranProcess($matches[1]);
    } elseif (preg_match('/^\/api\/albaranes-items\/(\d+)\/match$/', $path, $matches) && $method === 'PUT') {
        require_once __DIR__ . '/../src/routes/albaranes.php';
        handleAlbaranItemMatch($matches[1], $input);
    } elseif (preg_match('/^\/api\/albaranes-proveedores\/(\d+)\/complete$/', $path, $matches) && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/albaranes.php';
        handleAlbaranComplete($matches[1]);
    } elseif ($path === '/api/tipos-producto' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleTiposProducto();
    } elseif ($path === '/api/tipos-producto' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleTiposProductoCreate($input);
    } elseif ($path === '/api/cuentas-contables' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleCuentasContables();
    } elseif ($path === '/api/cuentas-contables' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleCuentasContablesCreate($input);
    } elseif ($path === '/api/tipos-iva' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleTiposIVA();
    } elseif ($path === '/api/tipos-iva' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleTiposIVACreate($input);
    } elseif ($path === '/api/centros-coste' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleCentrosCoste();
    } elseif ($path === '/api/centros-coste' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/accounting.php';
        handleCentrosCosteCreate($input);
    } elseif (preg_match('/^\/api\/configuracion-hotel(\/(\d+))?$/', $path, $matches) && in_array($method, ['GET', 'POST'])) {
        require_once __DIR__ . '/../src/routes/config.php';
        handleConfiguracionHotel($method, $input);
    } elseif ($path === '/api/reglas-normalizacion' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/config.php';
        handleReglasNormalizacion();
    } elseif ($path === '/api/reglas-normalizacion' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/config.php';
        handleReglasNormalizacionCreate($input);
    } elseif (preg_match('/^\/api\/barcode\/(.+)$/', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/utils.php';
        handleBarcode($matches[1]);
    } elseif ($path === '/api/email/process-invoice' && $method === 'POST') {
        require_once __DIR__ . '/../src/routes/email.php';
        handleProcessInvoice($input);
    } elseif ($path === '/api/email/pending' && $method === 'GET') {
        require_once __DIR__ . '/../src/routes/email.php';
        handlePendingEmails();
    } elseif ($path === '/' && $method === 'GET') {
        // Serve frontend
        header('Content-Type: text/html');
        readfile(__DIR__ . '/../../frontend/index.html');
        exit;
    } elseif ($path === '/mobile' && $method === 'GET') {
        header('Content-Type: text/html');
        readfile(__DIR__ . '/../../mobile.html');
        exit;
    } elseif ($path === '/manifest.json' && $method === 'GET') {
        header('Content-Type: application/json');
        readfile(__DIR__ . '/../../manifest.json');
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}