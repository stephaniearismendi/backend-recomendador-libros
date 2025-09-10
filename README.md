# Red Social de Recomendación de Libros - API Backend

## Resumen

Este proyecto implementa una API backend para una aplicación móvil de recomendación social de libros. El sistema combina algoritmos de filtrado colaborativo, junto a características de red social, y crea una plataforma inteligente que conecta lectores, facilita el descubrimiento de libros y construye comunidades alrededor de la literatura.

## Visión General del Proyecto

### Planteamiento del Problema

Los sistemas tradicionales de recomendación de libros a menudo carecen de contexto social y participación comunitaria. Los lectores típicamente descubren libros a través de algoritmos aislados o investigación personal, perdiendo las conexiones sociales.

### Solución

Este backend proporciona una API RESTful que impulsa una plataforma de recomendación social de libros con las siguientes características:

- **Recomendaciones Inteligentes**: Sistema híbrido de recomendación que combina filtrado colaborativo con señales sociales
- **Características Sociales**: Seguimiento de usuarios, publicaciones, historias y clubes de lectura
- **Gamificación**: Sistema de logros y estadísticas de lectura
- **Datos Multi-fuente**: Integración con Google Books API, New York Times API y otras fuentes de datos literarios
- **Características en Tiempo Real**: Actualizaciones en vivo y notificaciones

### Características Principales

- Autenticación de usuarios y gestión de perfiles
- Catálogo de libros con metadatos completos
- Capacidades de redes sociales (seguir, publicaciones, historias)
- Seguimiento de sesiones de lectura y estadísticas
- Clubes de lectura y características comunitarias
- Gamificación con logros y insignias
- Soporte multiidioma con capacidades de traducción

## Arquitectura Técnica

### Tecnologías Principales

- **Runtime**: Node.js 16+ con framework Express.js
- **Base de Datos**: PostgreSQL con Prisma ORM para operaciones de base de datos type-safe
- **Autenticación**: Autenticación stateless basada en JWT
- **Seguridad**: bcrypt para hash de contraseñas, rate limiting con Bottleneck
- **Logging**: Pino para logging estructurado y de alto rendimiento
- **Testing**: Jest para pruebas unitarias e integración

### Integraciones Externas

- **Google Books API**: Metadatos de libros e imágenes de portadas
- **New York Times API**: Listas de bestsellers y reseñas de libros
- **DeepL API**: Soporte de traducción multiidioma
- **BigBook API**: Información adicional de libros y reseñas

### Herramientas de Desarrollo

- **Prisma**: Gestión de esquemas de base de datos y migraciones

## Instalación y Configuración

### Prerrequisitos

- Node.js 16 o superior
- PostgreSQL 12 o superior
- npm o yarn como gestor de paquetes

### Configuración del Entorno

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd BACKEND
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crear un archivo `.env` en el directorio raíz con las siguientes variables:
   ```env
   # Configuración de Base de Datos
   DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_bd"
   
   # Configuración de la Aplicación
   NODE_ENV="development"
   PORT=3000
   HTTP_LOG=1
   
   # Seguridad
   JWT_SECRET="tu-clave-secreta-jwt-super-segura"
   
   # Claves de APIs Externas
   DEEPL_API_KEY="tu-clave-api-deepl"
   GOOGLE_BOOKS_API_KEY="tu-clave-api-google-books"
   NYT_KEY="tu-clave-api-new-york-times"
   BIGBOOK_API_KEY="tu-clave-api-bigbook"
   ```

4. **Configuración de la base de datos**
   ```bash
   # Generar cliente Prisma
   npx prisma generate
   
   # Ejecutar migraciones de base de datos
   npx prisma migrate dev
   
   # (Opcional) Poblar la base de datos con datos de ejemplo
   npm run seed
   ```

5. **Iniciar el servidor de desarrollo**
   ```bash
   npm start
   ```

La API estará disponible en `http://localhost:3000`

## Estructura del Proyecto

```
src/
├── controllers/        # Lógica de negocio y manejo de peticiones
│   ├── userController.js
│   ├── bookController.js
│   ├── socialController.js
│   ├── gamificationController.js
│   └── ...
├── routes/            # Definiciones de rutas de la API
│   ├── userRoutes.js
│   ├── bookRoutes.js
│   ├── socialRoutes.js
│   └── ...
├── services/          # Servicios de lógica de negocio
│   ├── UserService.js
│   ├── BookService.js
│   ├── RecommenderService.js
│   └── ...
├── repositories/      # Capa de acceso a datos
│   ├── UserRepository.js
│   ├── BookRepository.js
│   └── ...
├── middlewares/       # Autenticación y validación
│   ├── authMiddleware.js
│   └── validationMiddleware.js
├── dtos/             # Objetos de Transferencia de Datos
├── validators/       # Esquemas de validación de entrada
├── errors/           # Manejo personalizado de errores
├── core/             # Configuraciones centrales
├── database/         # Configuración de conexión a base de datos
└── server.js         # Punto de entrada de la aplicación

scripts/              # Inicialización para la base de datos (scripts)
├── init-users.js
├── init-posts.js
├── init-stories.js
└── seed-achievements.js

prisma/               # Esquema de base de datos
├── schema.prisma
```

## Documentación de la API

### Endpoints de Autenticación

| Método | Endpoint | Descripción | Autenticación Requerida |
|--------|----------|-------------|-------------------------|
| POST | `/users/register` | Registro de usuario | No |
| POST | `/users/login` | Autenticación de usuario | No |
| GET | `/users/profile` | Obtener perfil de usuario | Sí |
| PUT | `/users/profile` | Actualizar perfil de usuario | Sí |

### Gestión de Libros

| Método | Endpoint | Descripción | Autenticación Requerida |
|--------|----------|-------------|-------------------------|
| GET | `/books` | Obtener lista paginada de libros | No |
| GET | `/books/:id` | Obtener detalles de un libro | No |
| GET | `/books/search` | Buscar libros por consulta | No |
| GET | `/books/bestsellers` | Obtener bestsellers del NYT | No |

### Características Sociales

| Método | Endpoint | Descripción | Autenticación Requerida |
|--------|----------|-------------|-------------------------|
| POST | `/social/follow/:userId` | Seguir a un usuario | Sí |
| DELETE | `/social/follow/:userId` | Dejar de seguir a un usuario | Sí |
| GET | `/social/followers` | Obtener seguidores del usuario | Sí |
| GET | `/social/following` | Obtener usuarios seguidos | Sí |
| POST | `/social/posts` | Crear una nueva publicación | Sí |
| GET | `/social/posts` | Obtener publicaciones del feed | Sí |
| POST | `/social/stories` | Crear una historia | Sí |
| GET | `/social/stories` | Obtener historias activas | Sí |

### Gestión de Favoritos

| Método | Endpoint | Descripción | Autenticación Requerida |
|--------|----------|-------------|-------------------------|
| POST | `/favorites` | Agregar libro a favoritos | Sí |
| DELETE | `/favorites/:bookId` | Eliminar de favoritos | Sí |
| GET | `/favorites` | Obtener libros favoritos del usuario | Sí |

### Recomendaciones

| Método | Endpoint | Descripción | Autenticación Requerida |
|--------|----------|-------------|-------------------------|
| GET | `/recommendations` | Obtener recomendaciones personalizadas | Sí |
| GET | `/recommendations/trending` | Obtener libros trending | No |

### Gamificación

| Método | Endpoint | Descripción | Autenticación Requerida |
|--------|----------|-------------|-------------------------|
| GET | `/gamification/achievements` | Obtener logros del usuario | Sí |
| GET | `/gamification/stats` | Obtener estadísticas de lectura | Sí |
| POST | `/gamification/reading-session` | Registrar sesión de lectura | Sí |

## Esquema de Base de Datos

### Modelos Principales

#### Gestión de Usuarios
- **User**: Perfiles de usuario con información personalizable
- **Follow**: Relaciones de seguimiento entre usuarios
- **Achievement**: Logros de gamificación e insignias

#### Gestión de Contenido
- **Book**: Catálogo de libros con metadatos completos
- **Post**: Publicaciones sociales con referencias a libros
- **Comment**: Comentarios en publicaciones y libros
- **Story**: Historias temporales (expiración de 24 horas)
- **Club**: Clubes de lectura y comunidades
- **ClubMessage**: Mensajes dentro de clubes de lectura

#### Interacciones de Usuario
- **Favorite**: Libros favoritos del usuario
- **Like**: Sistema de likes para publicaciones y comentarios
- **ReadingSession**: Seguimiento de actividad de lectura
- **UserStats**: Estadísticas agregadas del usuario

### Características de la Base de Datos

- **Cumplimiento ACID**: Soporte completo de transacciones
- **Integridad Referencial**: Restricciones de claves foráneas
- **Indexación**: Consultas optimizadas para rendimiento
- **Migraciones**: Cambios de esquema controlados por versión
- **Seeding**: Generación automatizada de datos de prueba

## Scripts de Desarrollo

### Gestión de Base de Datos
```bash
# Generar cliente Prisma
npm run prisma:generate

# Ejecutar migraciones de base de datos
npm run prisma:migrate

# Resetear base de datos (solo desarrollo)
npm run prisma:reset

# Ver base de datos en Prisma Studio
npm run prisma:studio
```

### Inicialización de Datos
```bash
# Scripts de iniciación individuales
node scripts/init-users.js      # Crea usuarios de ejemplo
node scripts/init-posts.js      # Crea publicaciones de ejemplo
node scripts/init-stories.js    # Crea historias de ejemplo
node scripts/init-clubs.js      # Crea clubes de lectura
node scripts/seed-achievements.js # Crea sistema de logros
```

## Autenticación

El sistema utiliza JWT (JSON Web Tokens) para autenticación stateless. Incluir el token en el header Authorization para endpoints protegidos:

```http
Authorization: Bearer <tu-token-jwt>
```

### Estructura del Token
- **Expiración**: 24 horas
- **Algoritmo**: HS256
- **Payload**: ID de usuario, email e información de rol

## Logging y Monitoreo

### Logging Estructurado con Pino
- **Request IDs**: Identificadores únicos para trazabilidad de peticiones
- **Métricas de Rendimiento**: Tiempo de respuesta y uso de memoria
- **Seguimiento de Errores**: Logging detallado de errores con stack traces
- **Específico por Entorno**: Logs detallados en desarrollo, optimizados en producción

### Niveles de Log
- `error`: Errores del sistema y excepciones
- `warn`: Condiciones de advertencia
- `info`: Información general
- `debug`: Información detallada de debugging