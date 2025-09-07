# API Endpoints - Sistema de Seeding de Usuarios

Este documento describe el sistema de seeding de usuarios que utiliza la [RandomUser API](https://publicapi.dev/random-user-api) para poblar la base de datos con usuarios de prueba.

## Base URL
```
http://localhost:3000/api/seed
```

## Endpoints Disponibles

### 1. Seeder de Usuarios
**POST** `/users`

Crea usuarios aleatorios en la base de datos usando la RandomUser API.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "count": 20
}
```

**Parámetros:**
- `count` (opcional) - Número de usuarios a crear (máximo 100, por defecto 20)

**Respuesta exitosa (200):**
```json
{
  "message": "Users seeded successfully",
  "count": 20,
  "users": [
    {
      "username": "jeanwade123",
      "email": "jean.wade@example.com",
      "name": "Jean Wade",
      "bio": "Hola! Soy Jean y me encanta leer libros de fantasía.",
      "avatar": "https://randomuser.me/api/portraits/women/74.jpg"
    }
  ]
}
```

**Errores:**
- `400` - Count demasiado alto (máximo 100)
- `500` - Error del servidor

---

### 2. Obtener Usuarios Aleatorios
**GET** `/users/random?count=10`

Obtiene usuarios aleatorios de la base de datos local.

**Parámetros de Query:**
- `count` (opcional) - Número de usuarios a obtener (por defecto 10)

**Respuesta exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Jean Wade",
    "username": "jeanwade123",
    "bio": "Hola! Soy Jean y me encanta leer libros de fantasía.",
    "avatar": "https://randomuser.me/api/portraits/women/74.jpg",
    "isFollowing": false,
    "followersCount": 0,
    "followingCount": 0
  }
]
```

---

### 3. Limpiar Usuarios de Prueba
**DELETE** `/users/test`

Elimina todos los usuarios de prueba (con contraseña 'temp123').

**Respuesta exitosa (200):**
```json
{
  "message": "Test users cleared",
  "count": 15
}
```

---

### 4. Estado del Seeding
**GET** `/status`

Verifica si ya existen usuarios en la base de datos.

**Respuesta exitosa (200):**
```json
{
  "hasUsers": true,
  "message": "Users exist in database"
}
```

---

## Script de Inicialización

### Ejecutar Script Automático
```bash
node scripts/init-users.js
```

Este script:
- ✅ Verifica si ya hay usuarios en la BD
- ✅ Si no hay usuarios, crea 20 automáticamente
- ✅ Muestra el progreso y resultados
- ✅ Es seguro ejecutar múltiples veces

### Integración en package.json
```json
{
  "scripts": {
    "seed:users": "node scripts/init-users.js",
    "dev": "npm run seed:users && npm start"
  }
}
```

---

## Flujo de Datos

### 1. **API Externa → Transformación → BD**
```
RandomUser API → userSeeder.transformUserData() → Prisma → PostgreSQL
```

### 2. **Datos Transformados**
```javascript
// API Externa
{
  "name": {"first": "Jean", "last": "Wade"},
  "email": "jean.wade@example.com",
  "picture": {"large": "https://..."}
}

// Transformado para BD
{
  "username": "jeanwade123",
  "email": "jean.wade@example.com", 
  "name": "Jean Wade",
  "bio": "Hola! Soy Jean y me encanta leer libros de fantasía.",
  "avatar": "https://randomuser.me/api/portraits/women/74.jpg",
  "password": "temp123"
}
```

---

## Ventajas del Sistema

### ✅ **Performance**
- Usuarios almacenados localmente
- Sin latencia de API externa
- Respuestas instantáneas

### ✅ **Confiabilidad**
- No depende de servicios externos
- Funciona offline
- Datos consistentes

### ✅ **Funcionalidad Completa**
- Follow/unfollow real
- Perfiles persistentes
- Estadísticas reales

### ✅ **Flexibilidad**
- Fácil de personalizar
- Control total de datos
- Escalable

---

## Ejemplos de Uso

### Inicializar Usuarios (Desarrollo)
```bash
# Opción 1: Script automático
node scripts/init-users.js

# Opción 2: API endpoint
curl -X POST http://localhost:3000/api/seed/users \
  -H "Content-Type: application/json" \
  -d '{"count": 20}'
```

### Obtener Usuarios para Sugerencias
```javascript
const response = await fetch('http://localhost:3000/api/seed/users/random?count=10');
const users = await response.json();
```

### Limpiar Datos de Prueba
```bash
curl -X DELETE http://localhost:3000/api/seed/users/test
```

---

## Configuración Recomendada

### 1. **Desarrollo**
- Ejecutar `node scripts/init-users.js` al iniciar
- Crear 20-50 usuarios de prueba
- Usar para testing y desarrollo

### 2. **Producción**
- No usar seeding automático
- Usuarios reales se registran normalmente
- Sistema funciona sin usuarios de prueba

### 3. **Testing**
- Limpiar usuarios de prueba antes de tests
- Crear usuarios específicos para cada test
- Usar `DELETE /seed/users/test` para limpiar

---

## Notas Importantes

1. **Contraseñas Temporales**: Los usuarios seedeados tienen contraseña 'temp123'
2. **Usernames Únicos**: El sistema garantiza usernames únicos automáticamente
3. **Biografías Generadas**: Se crean biografías realistas basadas en géneros literarios
4. **Avatares Reales**: Se usan fotos reales de la RandomUser API
5. **Fallback Inteligente**: Si no hay usuarios en BD, usa usuarios hardcodeados
6. **Seguro para Producción**: Solo crea usuarios si no existen previamente
