# Sistema de Control de Compras y Stock para Hotel

Un sistema completo de gestión de inventario diseñado específicamente para hoteles, con control de proveedores, productos, almacenes múltiples, órdenes de compra, recepción de facturas por email y aplicación móvil para recepción de mercancías.

## 🚀 Características Principales

### Gestión de Inventario
- ✅ Catálogo de productos con códigos de barras
- ✅ Múltiples almacenes con transferencias entre ellos
- ✅ Control de stock mínimo y alertas
- ✅ Movimientos de entrada, salida, ajustes y transferencias

### Proveedores y Compras
- ✅ Gestión completa de proveedores
- ✅ Mapeo de productos proveedores ↔ productos internos
- ✅ Órdenes de compra con comparación de precios
- ✅ Procesamiento automático de albaranes/entregas
- ✅ Normalización inteligente de nombres de productos
- ✅ Matching automático con productos del inventario
- ✅ Recepción automática de facturas por email
- ✅ Detección automática de discrepancias

### Aplicación Móvil
- ✅ PWA instalable en Android
- ✅ Escaneo de códigos de barras
- ✅ Recepción de mercancías en almacén
- ✅ Consulta de stock en tiempo real

### Gestión Contable
- ✅ Tipos de producto (Mercadería, Servicio, etc.)
- ✅ Plan de cuentas contables con importación Excel
- ✅ Tipos de IVA aplicables
- ✅ Centros de costes para análisis
- ✅ Configuración de empresa/hotel

## 🛠️ Instalación y Configuración

### Prerrequisitos
- Node.js 14+
- MySQL 8.0+
- NPM o Yarn

### 1. Clonar e Instalar Dependencias
```bash
git clone <repository-url>
cd inventario-sistema
npm install
```

### 2. Configurar Base de Datos
```bash
# Crear base de datos en MySQL
mysql -u root -p
CREATE DATABASE inventario_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;

# Ejecutar el esquema inicial
mysql -u root -p inventario_db < backend/database/schema.sql

# Si hay problemas con las vistas, ejecutar:
npm run create-views
```

#### 🔧 Solución a Error de Collation
Si encuentras el error `Illegal mix of collations`, ejecuta la migración:

```bash
npm run migrate-collation
```

Este error ocurre cuando la base de datos tiene tablas con diferentes configuraciones de collation. El script de migración unifica todo a `utf8mb4_unicode_ci`.

#### 📊 Verificación de Base de Datos
Para verificar la estructura de tu base de datos y ver qué campos tiene la tabla productos:

```bash
npm run check-db
```

Este comando muestra la estructura de la tabla productos, la vista, y algunos datos de ejemplo.

####  Actualización del Campo Descripción
Si tienes una base de datos existente y las descripciones de productos no aparecen en el frontend, ejecuta:

```bash
npm run update-view-descripcion
```

Este comando actualiza la vista `vista_productos_stock` para incluir el campo `descripcion` que se agregó recientemente.

### 3. Configurar Variables de Entorno
Crear archivo `.env` en la raíz del proyecto:
```env
DB_HOST=localhost
DB_USER=sistema
DB_PASSWORD=tu_password_mysql
DB_NAME=inventario_db
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-app
PORT=3000
```

### 4. Iniciar el Servidor
```bash
npm start
# o para desarrollo
npm run dev
```

### 5. Acceder al Sistema
- **Escritorio**: http://localhost:3000
- **Móvil**: http://localhost:3000/mobile

## 📦 Procesamiento de Entregas de Proveedores

El módulo de procesamiento de entregas sigue este flujo automatizado:

```
[Recibir Albarán] → [Extraer Datos] → [Normalizar Nombres] → [Comparar con Inventario] → [Generar Reporte] → [Actualizar Inventario]
```

### Características:
- ✅ **Extracción automática** de datos de productos (nombre, código, cantidad, precio)
- ✅ **Normalización inteligente** de nombres de productos usando reglas configurables
- ✅ **Matching automático** con productos del inventario usando mapeos y similitud
- ✅ **Matching manual** para productos no identificados
- ✅ **Actualización automática** del inventario una vez procesado
- ✅ **Reportes detallados** de productos coincidentes vs no identificados

### Flujo de Trabajo:
1. **Recibir Albarán**: Registra el albarán con todos los productos del proveedor
2. **Procesamiento Automático**: El sistema intenta identificar cada producto automáticamente
3. **Revisión Manual**: Para productos no identificados, realiza matching manual
4. **Completar**: Actualiza el inventario y marca el albarán como completado

## 📊 Gestión Contable

El módulo de contabilidad permite gestionar toda la información financiera necesaria para el correcto funcionamiento del sistema.

### Características:
- ✅ **Tipos de Producto**: Clasificación de productos para análisis contable
- ✅ **Cuentas Contables**: Plan de cuentas completo con importación masiva desde Excel
- ✅ **Tipos de IVA**: Gestión de diferentes porcentajes de IVA aplicables
- ✅ **Centros de Coste**: Análisis por áreas o departamentos
- ✅ **Configuración de Empresa**: Información legal y de contacto del hotel/empresa

### Importación de Cuentas Contables:
1. Preparar archivo Excel con columnas: Código, Nombre, Descripción
2. En el módulo "Contabilidad" > "Cuentas Contables"
3. Hacer clic en "Importar Excel" y seleccionar el archivo
4. El sistema procesará automáticamente todas las cuentas

## 📱 Uso de la Aplicación Móvil

1. **Instalación PWA**:
   - Abrir http://localhost:3000/mobile en Chrome/Android
   - Tocar "Agregar a pantalla de inicio"

2. **Recepción de Mercancías**:
   - Escanear código de barras del producto
   - Ingresar cantidad recibida
   - Seleccionar almacén de destino
   - Confirmar recepción

## 🔧 API Endpoints

### Dashboard
- `GET /api/dashboard` - Estadísticas generales

### Proveedores
- `GET /api/proveedores` - Listar proveedores
- `POST /api/proveedores` - Crear proveedor
- `PUT /api/proveedores/:id` - Actualizar proveedor
- `DELETE /api/proveedores/:id` - Eliminar proveedor

### Productos
- `GET /api/productos` - Listar productos
- `POST /api/productos` - Crear producto

### Almacenes
- `GET /api/almacenes` - Listar almacenes
- `POST /api/almacenes` - Crear almacén

### Órdenes de Compra
- `GET /api/ordenes-compra` - Listar órdenes
- `POST /api/ordenes-compra` - Crear orden
- `GET /api/precios-mas-baratos` - Comparar precios

### Facturas
- `GET /api/facturas` - Listar facturas
- `POST /api/facturas` - Registrar factura
- `PUT /api/facturas/:id/aprobar` - Aprobar factura

### Stock
- `GET /api/stock/movimientos` - Movimientos de stock
- `POST /api/stock/movimiento` - Registrar movimiento
- `POST /api/stock/transferencia` - Transferir entre almacenes

### Albaranes de Proveedores
- `GET /api/albaranes-proveedores` - Listar albaranes
- `POST /api/albaranes-proveedores` - Crear albarán
- `GET /api/albaranes-proveedores/:id/items` - Items del albarán
- `POST /api/albaranes-proveedores/:id/process` - Procesar automáticamente
- `PUT /api/albaranes-items/:id/match` - Matching manual
- `POST /api/albaranes-proveedores/:id/complete` - Completar y actualizar stock

### Configuración del Hotel
- `GET /api/configuracion-hotel` - Obtener configuración
- `POST /api/configuracion-hotel` - Guardar configuración

### Datos Contables
- `GET /api/tipos-producto` - Listar tipos de producto
- `POST /api/tipos-producto` - Crear tipo de producto
- `GET /api/cuentas-contables` - Listar cuentas contables
- `POST /api/cuentas-contables` - Crear cuenta contable
- `POST /api/cuentas-contables/importar-excel` - Importar desde Excel
- `GET /api/tipos-iva` - Listar tipos de IVA
- `POST /api/tipos-iva` - Crear tipo de IVA
- `GET /api/centros-coste` - Listar centros de coste
- `POST /api/centros-coste` - Crear centro de coste

### Reglas de Normalización
- `GET /api/reglas-normalizacion` - Listar reglas
- `POST /api/reglas-normalizacion` - Crear regla

### Datos Contables
- `GET /api/tipos-producto` - Listar tipos de producto
- `POST /api/tipos-producto` - Crear tipo de producto
- `GET /api/cuentas-contables` - Listar cuentas contables
- `POST /api/cuentas-contables` - Crear cuenta contable
- `GET /api/tipos-iva` - Listar tipos de IVA
- `POST /api/tipos-iva` - Crear tipo de IVA
- `GET /api/centros-coste` - Listar centros de coste
- `POST /api/centros-coste` - Crear centro de coste

### Email
- `POST /api/email/process-invoice` - Procesar email con factura

## 📊 Estructura de Base de Datos

### Tablas Principales
- `proveedores` - Información de proveedores
- `productos` - Catálogo de productos internos
- `almacenes` - Almacenes/ubicaciones
- `stock_almacen` - Stock por almacén
- `mapeos` - Relación proveedor-producto
- `ordenes_compra` - Órdenes de compra
- `albaranes_proveedores` - Albaranes/entregas de proveedores
- `albaranes_items` - Items de albaranes (datos crudos)
- `reglas_normalizacion` - Reglas de normalización de nombres
- `configuracion_hotel` - Información del hotel/empresa
- `facturas` - Facturas/recibos
- `movimientos_stock` - Historial de movimientos

### Tablas Contables
- `tipo_producto` - Tipos de producto (Mercadería, Servicio, etc.)
- `cuenta_contable` - Plan de cuentas contables
- `tipo_iva` - Tipos de IVA aplicables
- `centro_coste` - Centros de costes para análisis

## 🔒 Seguridad

- Validación de entrada en todas las APIs
- Sanitización de datos
- Control de acceso básico
- Logs de operaciones

## 🚀 Despliegue en Producción

1. **Configurar servidor MySQL**
2. **Actualizar variables de entorno**
3. **Configurar email SMTP**
4. **Configurar HTTPS**
5. **Optimizar para móvil**

## 📝 Notas de Desarrollo

- El sistema usa triggers automáticos para actualizar stock
- Las discrepancias en facturas se detectan automáticamente
- La aplicación móvil es una PWA que funciona sin conexión básica
- Los códigos de barras se generan pero requieren implementación completa

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 📞 Soporte

Para soporte técnico, crear un issue en el repositorio o contactar al equipo de desarrollo.