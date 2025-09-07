# API - Relación Post-Book Refactorizada

## Descripción
Se ha refactorizado la relación entre posts y libros para usar una relación directa en lugar de duplicar campos. Ahora los posts tienen una relación opcional con la tabla `Book`.

## Cambios en el esquema de base de datos

### Antes:
```prisma
model Post {
  id         String    @id @default(cuid())
  userId     Int
  text       String?
  bookTitle  String?   // ❌ Duplicado
  bookAuthor String?   // ❌ Duplicado  
  bookCover  String?   // ❌ Duplicado
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id])
  likes      Like[]
  comments   PostComment[]
}
```

### Después:
```prisma
model Post {
  id         String    @id @default(cuid())
  userId     Int
  text       String?
  bookId     String?   // ✅ Relación directa
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id])
  book       Book?     @relation(fields: [bookId], references: [id]) // ✅ Relación
  likes      Like[]
  comments   PostComment[]
}

model Book {
  id          String           @id
  title       String
  author      String
  imageUrl    String?
  description String?
  rating      String?
  category    String?
  reviews     Review[]
  favorites   Favorite[]
  sessions    ReadingSession[]
  posts       Post[]           // ✅ Relación inversa
}
```

## Cambios en los endpoints

### 1. Crear Post
**POST** `/api/social/posts`

#### Antes:
```json
{
  "text": "Me encanta este libro",
  "book": {
    "title": "El Quijote",
    "author": "Miguel de Cervantes",
    "cover": "https://covers.openlibrary.org/b/id/123456-M.jpg"
  }
}
```

#### Después:
```json
{
  "text": "Me encanta este libro",
  "bookId": "/books/El%20Quijote-Miguel%20de%20Cervantes"
}
```

#### Respuesta:
```json
{
  "id": "post_id"
}
```

#### Errores:
- `400 BOOK_NOT_FOUND`: El bookId proporcionado no existe en la base de datos

### 2. Obtener Feed
**GET** `/api/social/feed`

#### Respuesta actualizada:
```json
[
  {
    "id": "post_id",
    "user": { "id": 1, "name": "Usuario", "avatar": "..." },
    "time": "2024-01-01T00:00:00Z",
    "text": "Me encanta este libro",
    "book": {
      "id": "/books/El%20Quijote-Miguel%20de%20Cervantes",
      "title": "El Quijote",
      "author": "Miguel de Cervantes",
      "cover": "https://covers.openlibrary.org/b/id/123456-M.jpg"
    },
    "likes": 5,
    "comments": [...]
  }
]
```

## Ventajas de la nueva implementación

### ✅ **Normalización de datos**
- No hay duplicación de información de libros
- Un solo lugar para mantener los datos del libro
- Consistencia garantizada

### ✅ **Integridad referencial**
- Si se actualiza un libro, todos los posts se actualizan automáticamente
- No se pueden crear posts con libros inexistentes
- Relaciones claras y mantenibles

### ✅ **Mejor rendimiento**
- Menos almacenamiento (no duplicación)
- Consultas más eficientes con JOINs
- Índices optimizados

### ✅ **Escalabilidad**
- Fácil agregar nuevos campos a libros sin afectar posts
- Relaciones más flexibles para futuras funcionalidades

## Migración de datos

La migración automática:
1. Eliminó las columnas `bookTitle`, `bookAuthor`, `bookCover` de la tabla `Post`
2. Agregó la columna `bookId` como clave foránea opcional
3. Estableció la relación entre `Post` y `Book`

## Uso en el frontend

### Para crear un post con libro:
```javascript
// Primero asegúrate de que el libro existe en la base de datos
const bookId = "/books/El%20Quijote-Miguel%20de%20Cervantes";

const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "Me encanta este libro",
    bookId: bookId
  })
});
```

### Para crear un post sin libro:
```javascript
const response = await fetch('/api/social/posts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    text: "¡Hola mundo!"
  })
});
```

## Notas importantes

1. **Los posts existentes** que tenían información de libro se han perdido en la migración (como se advirtió)
2. **Los comentarios** mantienen su relación opcional con libros (campos `bookTitle`, `bookAuthor`, `bookCover`)
3. **La funcionalidad de favoritos** sigue funcionando igual, ya que usa la tabla `Book` directamente
4. **Es necesario** que el libro exista en la base de datos antes de crear un post que lo referencie
