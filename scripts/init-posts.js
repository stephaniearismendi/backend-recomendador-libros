const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Función para buscar libros populares en Open Library
async function searchPopularBooks() {
    const popularSubjects = [
        'fiction',
        'science fiction',
        'fantasy',
        'mystery',
        'romance',
        'thriller',
        'biography',
        'history',
        'philosophy',
        'literature'
    ];
    
    const books = [];
    
    for (const subject of popularSubjects) {
        try {
            console.log(`🔍 Buscando libros de: ${subject}`);
            const response = await fetch(`https://openlibrary.org/subjects/${subject}.json?limit=3&offset=${Math.floor(Math.random() * 20)}`);
            const data = await response.json();
            
            if (data.works && data.works.length > 0) {
                for (const work of data.works) {
                    const book = {
                        text: generatePostText(work.title, work.authors?.[0]?.name || 'Autor desconocido'),
                        bookTitle: work.title,
                        bookAuthor: work.authors?.[0]?.name || 'Autor desconocido',
                        bookCover: work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg` : null,
                        bookId: work.key, // ID original de Open Library
                        subject: subject
                    };
                    books.push(book);
                }
            }
            
            // Pausa para no sobrecargar la API
            await new Promise(resolve => setTimeout(resolve, 300));
            
        } catch (error) {
            console.error(`Error buscando ${subject}:`, error.message);
        }
    }
    
    return books;
}

// Función para generar texto de post basado en el libro
function generatePostText(title, author) {
    const templates = [
        `Acabo de terminar '${title}' de ${author}. ¡Qué obra increíble! La forma en que el autor desarrolla la historia es simplemente fascinante. ¿Alguien más ha leído este libro?`,
        `Recomiendo mucho '${title}' de ${author}. La prosa es hermosa y la trama te mantiene enganchado desde la primera página. Perfecto para los amantes de la buena literatura.`,
        `Estoy leyendo '${title}' de ${author} y me está impactando mucho. La profundidad de los personajes y la riqueza de la narrativa son excepcionales. ¿Qué opinan de esta obra?`,
        `¡Acabo de descubrir a ${author}! Estoy leyendo '${title}' y me encanta su estilo único. Es una experiencia literaria que no olvidaré fácilmente.`,
        `Para los amantes de la lectura, '${title}' de ${author} es una joya que no pueden perderse. La trama es envolvente y llena de sorpresas inesperadas.`,
        `Estoy releyendo '${title}' y cada vez me sorprende más la maestría de ${author}. La riqueza de detalles y la profundidad emocional son impresionantes.`,
        `¿Alguien ha leído '${title}' de ${author}? Es una perspectiva fascinante que me ha hecho reflexionar mucho. Muy recomendado para expandir horizontes.`,
        `Acabo de terminar '${title}' de ${author}. La forma en que entrelaza los diferentes elementos de la historia es magistral. Una obra que definitivamente vale la pena.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
}

// Comentarios de ejemplo
const sampleComments = [
    "¡Totalmente de acuerdo! Es una obra maestra.",
    "Me encanta ese libro, lo he leído varias veces.",
    "Gracias por la recomendación, lo voy a buscar.",
    "Ese autor es increíble, tiene un estilo único.",
    "Lo leí el año pasado y me impactó mucho.",
    "¿Sabías que hay una película basada en ese libro?",
    "Ese libro cambió mi perspectiva sobre la vida.",
    "Lo tengo en mi lista de pendientes desde hace tiempo.",
    "El final me dejó sin palabras, no me lo esperaba.",
    "Ese género no es mi favorito, pero este libro me sorprendió.",
    "¿Recomiendas otros libros del mismo autor?",
    "La prosa es realmente hermosa, cada frase es poesía.",
    "Lo estoy leyendo ahora mismo y me está encantando.",
    "Ese libro me hizo llorar, es muy emotivo.",
    "La construcción del mundo es impresionante.",
    "¿Hay una secuela? Me quedé con ganas de más.",
    "Ese libro me inspiró a empezar a escribir.",
    "La traducción es excelente, se nota la calidad.",
    "Ese libro me recordó por qué amo leer.",
    "¿Alguien más se sintió identificado con el protagonista?"
];

async function initPosts() {
    try {
        console.log('🌱 Iniciando seeder de posts con API de Open Library...');
        
        // Obtener todos los usuarios
        const users = await prisma.user.findMany({
            select: { id: true, username: true, name: true, avatar: true }
        });
        
        if (users.length === 0) {
            console.log('❌ No hay usuarios en la base de datos. Ejecuta primero: node scripts/init-users.js');
            return;
        }
        
        console.log(`📚 Encontrados ${users.length} usuarios`);
        
        // Limpiar datos existentes (en orden correcto por las claves foráneas)
        await prisma.like.deleteMany({});
        await prisma.postComment.deleteMany({});
        await prisma.post.deleteMany({});
        await prisma.book.deleteMany({}); // Eliminar libros existentes
        console.log('🧹 Posts, comentarios, likes y libros existentes eliminados');
        
        // Obtener libros de la API de Open Library
        console.log('🔍 Obteniendo libros de Open Library...');
        const samplePosts = await searchPopularBooks();
        
        if (samplePosts.length === 0) {
            console.log('❌ No se pudieron obtener libros de la API');
            return;
        }
        
        console.log(`📖 Obtenidos ${samplePosts.length} libros de Open Library`);
        
        // Crear libros únicos primero
        console.log('📚 Creando libros únicos...');
        const uniqueBooks = [];
        const bookMap = new Map();
        
        for (const postData of samplePosts) {
            // Usar el ID original del libro de Open Library
            const bookId = postData.bookId;
            
            if (!bookMap.has(bookId)) {
                const book = await prisma.book.upsert({
                    where: { id: bookId },
                    update: {},
                    create: {
                        id: bookId,
                        title: postData.bookTitle,
                        author: postData.bookAuthor,
                        imageUrl: postData.bookCover,
                        description: null,
                        rating: null,
                        category: postData.subject
                    }
                });
                
                bookMap.set(bookId, book);
                uniqueBooks.push(book);
                console.log(`📚 Libro creado: "${book.title}" por ${book.author} (ID: ${book.id})`);
            }
        }
        
        console.log(`✅ ${uniqueBooks.length} libros únicos creados`);
        
        // Crear posts
        console.log('📝 Creando posts...');
        const createdPosts = [];
        
        for (let i = 0; i < Math.min(samplePosts.length, users.length); i++) {
            const postData = samplePosts[i];
            const user = users[i];
            const book = bookMap.get(postData.bookId);
            
            if (book) {
                const post = await prisma.post.create({
                    data: {
                        text: postData.text,
                        userId: user.id,
                        bookId: book.id
                    }
                });
                
                createdPosts.push(post);
                console.log(`✅ Post creado: "${book.title}" por ${user.name || user.username}`);
            }
        }
        
        console.log(`✅ ${createdPosts.length} posts creados`);
        
        // Crear comentarios de ejemplo
        console.log('💬 Creando comentarios de ejemplo...');
        let commentCount = 0;
        
        for (const post of createdPosts) {
            const numComments = Math.floor(Math.random() * 5) + 1; // 1-5 comentarios por post
            
            for (let j = 0; j < numComments; j++) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
                
                await prisma.postComment.create({
                    data: {
                        text: randomComment,
                        userId: randomUser.id,
                        postId: post.id
                    }
                });
                
                commentCount++;
            }
        }
        
        console.log(`✅ ${commentCount} comentarios creados`);
        
        // Crear likes de ejemplo
        console.log('❤️ Creando likes de ejemplo...');
        let likeCount = 0;
        
        for (const post of createdPosts) {
            const numLikes = Math.floor(Math.random() * 8) + 1; // 1-8 likes por post
            const likedUsers = new Set();
            
            for (let k = 0; k < numLikes; k++) {
                let randomUser;
                do {
                    randomUser = users[Math.floor(Math.random() * users.length)];
                } while (likedUsers.has(randomUser.id));
                
                likedUsers.add(randomUser.id);
                
                await prisma.like.create({
                    data: {
                        userId: randomUser.id,
                        postId: post.id
                    }
                });
                
                likeCount++;
            }
        }
        
        console.log(`✅ ${likeCount} likes creados`);
        
        console.log('\n🎉 Seeder de posts completado exitosamente!');
        console.log('📊 Estadísticas:');
        console.log(`   - Libros únicos creados: ${uniqueBooks.length}`);
        console.log(`   - Posts creados: ${createdPosts.length}`);
        console.log(`   - Comentarios creados: ${commentCount}`);
        console.log(`   - Likes creados: ${likeCount}`);
        
    } catch (error) {
        console.error('❌ Error en el seeder de posts:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar el seeder
initPosts();
