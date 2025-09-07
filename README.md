# Backend para App de Recomendación de Libros

## ¿Qué es esto?

Un backend completo para una app móvil de recomendación de libros con features sociales. La idea es crear una comunidad donde la gente pueda compartir lo que está leyendo, seguir a otros lectores, y descubrir nuevos libros basándose en sus gustos y en lo que lee su red social.

## ¿Por qué existe?

La lectura puede ser una actividad solitaria, pero no tiene por qué serlo. Este proyecto busca conectar a lectores, crear conversaciones alrededor de los libros, y hacer que leer sea más facil

## Stack técnico

- **Node.js + Express** - El backend está hecho en JavaScript/Node.js
- **PostgreSQL + Prisma** - Base de datos relacional con un ORM moderno
- **JWT** - Autenticación sin sesiones, más escalable
- **Pino** - Logging rápido y estructurado
- **bcrypt** - Hash seguro de contraseñas
- **Bottleneck** - Rate limiting para evitar abusos

## Setup rápido

Necesitas Node.js (v16+) y PostgreSQL.

```bash
# Clonar el repo
git clone <tu-repo>
cd BACKEND

# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear .env con:
DATABASE_URL="postgresql://usuario:password@localhost:5432/nombre_db"
JWT_SECRET=tu_api_key
NODE_ENV="development"
PORT=3000
HTTP_LOG=1

DEEPL_API_KEY=tu_api_key
GOOGLE_BOOKS_API_KEY=tu_api_key
NYT_KEY=tu_api_key
BIGBOOK_API_KEY=tu_api_key


# Setup de la base de datos
npx prisma generate
npx prisma migrate dev

# Levantar el servidor
npm start
```

## Estructura del proyecto

```
src/
├── controllers/     # La lógica de negocio
├── routes/         # Las rutas de la API
├── middlewares/    # Auth y validaciones
├── services/       # Servicios auxiliares
├── database/       # Config de la BD
├── core/          # Configuraciones centrales
└── server.js      # Entry point

scripts/           # Para poblar la BD con datos de prueba
prisma/           # Schema y migraciones
```

## API

### Usuarios
- `POST /users/register` - Registrarse
- `POST /users/login` - Login
- `GET /users/profile` - Ver perfil
- `PUT /users/profile` - Editar perfil

### Libros
- `GET /books` - Lista de libros
- `GET /books/:id` - Info de un libro
- `GET /books/search` - Buscar libros

### Social
- `POST /social/follow/:userId` - Seguir a alguien
- `DELETE /social/follow/:userId` - Dejar de seguir
- `GET /social/followers` - Mis seguidores
- `GET /social/following` - A quién sigo
- `POST /social/posts` - Crear post
- `GET /social/posts` - Ver posts
- `POST /social/stories` - Crear historia
- `GET /social/stories` - Ver historias

### Favoritos
- `POST /favorites` - Agregar a favoritos
- `DELETE /favorites/:bookId` - Quitar de favoritos
- `GET /favorites` - Mis favoritos

### Recomendaciones
- `GET /recommendations` - Libros recomendados para ti

## Base de datos

### Modelos principales

- **User** - Usuarios con perfiles personalizables
- **Book** - Catálogo de libros con metadatos
- **Post** - Posts sociales con referencias a libros
- **Story** - Historias temporales (24h)
- **Club** - Clubs de lectura
- **Review** - Reseñas de libros
- **Favorite** - Libros favoritos por usuario
- **Follow** - Relaciones de seguimiento
- **Like** - Sistema de likes en posts

## Scripts útiles

```bash
# Poblar la BD con datos de prueba
node scripts/init-users.js
node scripts/init-posts.js
node scripts/init-comments.js
node scripts/init-stories.js

```

## Auth

El sistema usa JWT para autenticación. Para endpoints protegidos, incluye el token:

```
Authorization: Bearer <token>
```

## Logging

Usamos Pino para logs estructurados:
- Request IDs únicos
- Logs de performance en producción
- Logs detallados en desarrollo

## Deploy

1. Configurar variables de entorno de producción
2. `npx prisma migrate deploy`
3. `npm start`

## Documentación

- [Perfil de Usuario](API_USER_PROFILE.md)
- [Sistema de Seguimiento](API_FOLLOW_ENDPOINTS.md)
- [Posts y Libros](API_POST_BOOK_ENDPOINTS.md)

## TFG

Desarrollado como parte del Trabajo de Fin de Grado en Ingeniería Informática