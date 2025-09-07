# API Endpoints - Perfil de Usuario

Este documento describe los endpoints disponibles para la gestión del perfil de usuario en la aplicación móvil.

## Base URL
```
http://localhost:3000/api/users
```

## Autenticación
Todos los endpoints de perfil requieren autenticación. Incluye el token JWT en el header:
```
Authorization: Bearer <token>
```

## Endpoints Disponibles

### 1. Obtener Perfil Completo
**GET** `/profile`

Obtiene toda la información del perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta exitosa (200):**
```json
{
  "user": {
    "id": 1,
    "username": "lector123",
    "email": "usuario@ejemplo.com",
    "name": "María García",
    "bio": "Amante de los libros de fantasía y ciencia ficción",
    "avatar": "https://ejemplo.com/avatar.jpg",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "_count": {
      "reviews": 12,
      "favorites": 8,
      "following": 15,
      "followers": 45
    }
  }
}
```

**Errores:**
- `401` - Token inválido o expirado
- `404` - Usuario no encontrado
- `500` - Error del servidor

---

### 2. Actualizar Perfil
**PUT** `/profile`

Actualiza la información del perfil del usuario.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body (todos los campos son opcionales):**
```json
{
  "name": "Nuevo Nombre",
  "username": "nuevo_usuario",
  "bio": "Nueva biografía del usuario"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Perfil actualizado",
  "user": {
    "id": 1,
    "username": "nuevo_usuario",
    "email": "usuario@ejemplo.com",
    "name": "Nuevo Nombre",
    "bio": "Nueva biografía del usuario",
    "avatar": "https://ejemplo.com/avatar.jpg",
    "updatedAt": "2024-01-15T15:45:00.000Z"
  }
}
```

**Errores:**
- `400` - Datos inválidos
- `401` - Token inválido o expirado
- `409` - El nombre de usuario ya está en uso
- `500` - Error del servidor

---

### 3. Actualizar Avatar
**PUT** `/avatar`

Actualiza la foto de perfil del usuario.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "avatar": "https://ejemplo.com/nueva-foto.jpg"
}
```

**Respuesta exitosa (200):**
```json
{
  "message": "Avatar actualizado",
  "user": {
    "id": 1,
    "username": "lector123",
    "avatar": "https://ejemplo.com/nueva-foto.jpg"
  }
}
```

**Errores:**
- `400` - URL del avatar requerida
- `401` - Token inválido o expirado
- `500` - Error del servidor

---

## Campos del Modelo User

### Campos Principales
- `id` (Int) - ID único del usuario
- `username` (String) - Nombre de usuario único
- `email` (String) - Email único del usuario
- `password` (String) - Contraseña hasheada
- `name` (String, opcional) - Nombre real del usuario
- `bio` (String, opcional) - Biografía del usuario
- `avatar` (String, opcional) - URL de la foto de perfil
- `createdAt` (DateTime) - Fecha de creación
- `updatedAt` (DateTime) - Fecha de última actualización

### Contadores Incluidos
- `reviews` - Número de reseñas escritas
- `favorites` - Número de libros favoritos
- `following` - Número de usuarios que sigue
- `followers` - Número de seguidores

## Ejemplos de Uso en React Native/Expo

### Obtener Perfil
```javascript
const getProfile = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/users/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      setUser(data.user);
    } else {
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Actualizar Perfil
```javascript
const updateProfile = async (profileData) => {
  try {
    const response = await fetch('http://localhost:3000/api/users/profile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    const data = await response.json();
    if (response.ok) {
      setUser(data.user);
      Alert.alert('Éxito', data.message);
    } else {
      Alert.alert('Error', data.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Error de conexión');
  }
};
```

### Actualizar Avatar
```javascript
const updateAvatar = async (avatarUrl) => {
  try {
    const response = await fetch('http://localhost:3000/api/users/avatar', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: avatarUrl })
    });
    
    const data = await response.json();
    if (response.ok) {
      setUser(prev => ({ ...prev, avatar: data.user.avatar }));
      Alert.alert('Éxito', data.message);
    } else {
      Alert.alert('Error', data.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Error de conexión');
  }
};
```

## Notas Importantes

1. **Validación de Username**: El sistema verifica que el username sea único antes de permitir la actualización.

2. **Campos Opcionales**: Todos los campos de actualización son opcionales. Solo se actualizan los campos que se envían en el request.

3. **Timestamps**: Los campos `createdAt` y `updatedAt` se manejan automáticamente por la base de datos.

4. **Seguridad**: Las contraseñas no se devuelven en las respuestas de perfil por seguridad.

5. **Contadores**: Los contadores de reseñas, favoritos, etc. se calculan automáticamente y se incluyen en la respuesta del perfil.
