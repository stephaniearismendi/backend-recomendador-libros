# API - Sistema de Seguimiento

Endpoints para seguir/dejar de seguir usuarios. Básicamente como Instagram pero para lectores.

## Base URL
```
http://localhost:3000/social
```

## Auth
Todos los endpoints necesitan el token JWT:
```
Authorization: Bearer <token>
```

## Endpoints

### Toggle Follow/Unfollow
**POST** `/follow/:userId/toggle`

Cambia entre seguir y no seguir a un usuario. Si ya lo sigues, lo dejas de seguir y viceversa.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `userId` (path) - ID del usuario

**Respuesta (200):**
```json
{
  "following": true,
  "followersCount": 45,
  "followingCount": 15,
  "message": "Usuario seguido"
}
```

**Errores:**
- `400` - ID inválido o intentas seguirte a ti mismo
- `401` - Token inválido
- `404` - Usuario no existe
- `500` - Error del servidor

### Seguir Usuario
**POST** `/follow/:userId`

Sigue a un usuario específico.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `userId` (path) - ID del usuario

**Respuesta (200):**
```json
{
  "following": true,
  "followersCount": 45,
  "followingCount": 15,
  "message": "Usuario seguido exitosamente"
}
```

**Errores:**
- `400` - ID inválido o intentas seguirte a ti mismo
- `401` - Token inválido
- `404` - Usuario no existe
- `409` - Ya sigues a este usuario
- `500` - Error del servidor

### Dejar de Seguir
**DELETE** `/follow/:userId`

Deja de seguir a un usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `userId` (path) - ID del usuario

**Respuesta (200):**
```json
{
  "following": false,
  "followersCount": 44,
  "followingCount": 14,
  "message": "Usuario dejado de seguir exitosamente"
}
```

**Errores:**
- `400` - ID de usuario inválido o intento de dejar de seguirse a sí mismo
- `401` - Token inválido o expirado
- `404` - Usuario no encontrado
- `409` - No estás siguiendo a este usuario
- `500` - Error del servidor

---

### 4. Obtener Estado de Follow
**GET** `/follow/:userId/status`

Obtiene el estado de seguimiento entre el usuario autenticado y otro usuario.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros:**
- `userId` (path) - ID del usuario a consultar

**Respuesta exitosa (200):**
```json
{
  "following": true,
  "followersCount": 45,
  "followingCount": 15,
  "isOwnProfile": false
}
```

**Errores:**
- `400` - ID de usuario inválido
- `401` - Token inválido o expirado
- `404` - Usuario no encontrado
- `500` - Error del servidor

---

## Códigos de Error

| Código | Error | Descripción |
|--------|-------|-------------|
| `UNAUTHENTICATED` | 401 | Token inválido o expirado |
| `INVALID_TARGET` | 400 | ID de usuario inválido |
| `CANNOT_FOLLOW_SELF` | 400 | No puedes seguirte a ti mismo |
| `CANNOT_UNFOLLOW_SELF` | 400 | No puedes dejar de seguirte a ti mismo |
| `USER_NOT_FOUND` | 404 | Usuario no encontrado |
| `ALREADY_FOLLOWING` | 409 | Ya estás siguiendo a este usuario |
| `NOT_FOLLOWING` | 409 | No estás siguiendo a este usuario |
| `FOLLOW_TOGGLE_ERROR` | 500 | Error al alternar seguimiento |
| `FOLLOW_ERROR` | 500 | Error al seguir usuario |
| `UNFOLLOW_ERROR` | 500 | Error al dejar de seguir usuario |
| `FOLLOW_STATUS_ERROR` | 500 | Error al obtener estado de seguimiento |

## Ejemplos de Uso en React Native/Expo

### Follow Usuario
```javascript
const followUser = async (userId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/social/follow/${userId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      setFollowing(true);
      setFollowersCount(data.followersCount);
      Alert.alert('Éxito', data.message);
    } else {
      Alert.alert('Error', data.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Error de conexión');
  }
};
```

### Unfollow Usuario
```javascript
const unfollowUser = async (userId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/social/follow/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      setFollowing(false);
      setFollowersCount(data.followersCount);
      Alert.alert('Éxito', data.message);
    } else {
      Alert.alert('Error', data.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Error de conexión');
  }
};
```

### Toggle Follow/Unfollow
```javascript
const toggleFollow = async (userId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/social/follow/${userId}/toggle`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      setFollowing(data.following);
      setFollowersCount(data.followersCount);
      setFollowingCount(data.followingCount);
      Alert.alert('Éxito', data.message);
    } else {
      Alert.alert('Error', data.error);
    }
  } catch (error) {
    Alert.alert('Error', 'Error de conexión');
  }
};
```

### Obtener Estado de Follow
```javascript
const getFollowStatus = async (userId) => {
  try {
    const response = await fetch(`http://localhost:3000/api/social/follow/${userId}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (response.ok) {
      setFollowing(data.following);
      setFollowersCount(data.followersCount);
      setFollowingCount(data.followingCount);
      setIsOwnProfile(data.isOwnProfile);
    } else {
      console.error('Error getting follow status:', data.error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Notas Importantes

1. **Validación de Usuario**: El sistema verifica que el usuario objetivo exista antes de realizar cualquier operación.

2. **Prevención de Auto-seguimiento**: No se permite seguirse o dejar de seguirse a sí mismo.

3. **Contadores Actualizados**: Todos los endpoints devuelven los contadores actualizados de seguidores y seguidos.

4. **Mensajes Descriptivos**: Cada respuesta incluye un mensaje descriptivo del resultado de la operación.

5. **Compatibilidad**: El endpoint `toggle` mantiene compatibilidad con implementaciones anteriores.

6. **Estado de Perfil**: El endpoint de estado incluye información sobre si es el perfil propio del usuario.

7. **Manejo de Errores**: Códigos de error específicos para diferentes situaciones (ya siguiendo, no siguiendo, etc.).
