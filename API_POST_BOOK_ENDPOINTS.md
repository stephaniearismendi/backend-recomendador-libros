# API Endpoints para Libros en Posts

## Descripción
Estos endpoints permiten interactuar con los libros que aparecen en los posts, incluyendo obtener sus detalles y agregarlos a favoritos.

## Endpoints

### 1. Obtener detalles del libro de un post
**GET** `/api/social/posts/:postId/book`

Obtiene los detalles del libro asociado a un post específico.

#### Parámetros
- `postId` (string): ID del post

#### Respuesta exitosa (200)
```json
{
  "title": "El Quijote",
  "author": "Miguel de Cervantes",
  "cover": "https://covers.openlibrary.org/b/id/123456-M.jpg",
  "id": "/books/El%20Quijote-Miguel%20de%20Cervantes"
}
```

#### Errores
- `404 POST_NOT_FOUND`: El post no existe
- `404 NO_BOOK_IN_POST`: El post no tiene un libro asociado
- `500 GET_BOOK_DETAILS_ERROR`: Error interno del servidor

---

### 2. Agregar libro de un post a favoritos
**POST** `/api/social/posts/:postId/book/favorite`

Agrega el libro asociado a un post a los favoritos del usuario autenticado.

#### Parámetros
- `postId` (string): ID del post

#### Headers requeridos
- `Authorization`: Token de autenticación

#### Respuesta exitosa (200)
```json
{
  "success": true,
  "message": "Libro agregado a favoritos",
  "book": {
    "id": "/books/El%20Quijote-Miguel%20de%20Cervantes",
    "title": "El Quijote",
    "author": "Miguel de Cervantes",
    "cover": "https://covers.openlibrary.org/b/id/123456-M.jpg"
  }
}
```

#### Errores
- `401 UNAUTHENTICATED`: Usuario no autenticado
- `404 POST_NOT_FOUND`: El post no existe
- `400 NO_BOOK_IN_POST`: El post no tiene un libro asociado
- `500 ADD_TO_FAVORITES_ERROR`: Error interno del servidor

## Mejoras implementadas

### 1. Comentarios en tiempo real
El endpoint `POST /api/social/posts/:postId/comments` ahora devuelve el comentario completo con todos los datos del usuario, incluyendo avatar por defecto si no tiene uno configurado. Esto permite que el frontend actualice inmediatamente la vista sin necesidad de recargar los comentarios.

### 2. Interacción con libros en posts
- **Ver detalles**: Los usuarios pueden hacer clic en un libro de un post para ver sus detalles
- **Agregar a favoritos**: Los usuarios pueden agregar directamente el libro a sus favoritos desde el post
- **ID único**: Se genera un ID único para cada libro basado en título y autor para evitar duplicados

## Uso en el frontend

### Para mostrar comentarios inmediatamente:
```javascript
// Al enviar un comentario
const response = await fetch(`/api/social/posts/${postId}/comments`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ text: commentText })
});

const newComment = await response.json();
// Agregar newComment directamente a la lista de comentarios
```

### Para obtener detalles del libro:
```javascript
const response = await fetch(`/api/social/posts/${postId}/book`);
const bookDetails = await response.json();
// Mostrar modal o página con los detalles del libro
```

### Para agregar libro a favoritos:
```javascript
const response = await fetch(`/api/social/posts/${postId}/book/favorite`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();
// Mostrar mensaje de éxito
```
