const prisma = require('../src/database/prisma');

class PostsInitializer {
    constructor() {
        this.postTemplates = [
            {
                type: 'book_recommendation',
                templates: [
                    "Acabo de terminar {bookTitle} de {author}. {opinion}",
                    "Estoy leyendo {bookTitle} y me está gustando. {opinion}",
                    "¿Alguien ha leído {bookTitle}? {opinion}",
                    "Recomiendo {bookTitle} de {author}. {opinion}",
                    "Terminé {bookTitle} anoche. {opinion} ¿Qué leo ahora?",
                ]
            },
            {
                type: 'reading_progress',
                templates: [
                    "Voy por la mitad de {bookTitle} y se pone interesante",
                    "Empecé {bookTitle} de {author}. Hasta ahora bien",
                    "Casi termino {bookTitle}. No puedo esperar el final",
                    "Leyendo {bookTitle} en la página {page}. Me gusta la historia",
                    "Llegué a un giro inesperado en {bookTitle}. No me lo esperaba",
                ]
            },
            {
                type: 'book_discussion',
                templates: [
                    "¿Qué está leyendo todo el mundo? Yo estoy con {bookTitle}",
                    "Busco recomendaciones de {genre}. ¿Alguna sugerencia?",
                    "¿Qué les pareció {bookTitle}?",
                    "¿A alguien más le gusta {author}? Estoy leyendo {bookTitle}",
                    "Descubrí a {author} y me gusta. Leyendo {bookTitle}",
                ]
            },
            {
                type: 'reading_thoughts',
                templates: [
                    "Nada como un buen libro en un día lluvioso",
                    "Leer es mi escape de la realidad",
                    "Organicé mi librero y encontré libros que había olvidado",
                    "Café y buen libro, mañana perfecta",
                    "Terminé un libro y ahora no sé qué leer",
                ]
            }
        ];


        this.opinions = [
            "La escritura es bonita y los personajes están bien desarrollados",
            "Es una lectura que te hace pensar",
            "Los giros de la trama me mantuvieron enganchado",
            "No pude soltarlo, lo terminé de una vez",
            "La construcción del mundo es buena",
            "Es un clásico por una razón",
            "El desarrollo de personajes está bien",
            "Es uno de esos libros que se queda contigo",
            "El estilo de escritura es único",
            "Me gustó cómo explora temas complejos"
        ];
    }

    async getRandomUsers(count = 10) {
        try {
            const users = await prisma.user.findMany({
                take: count,
                orderBy: {
                    id: 'desc'
                },
                select: {
                    id: true,
                    username: true,
                    name: true
                }
            });
            return users;
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    async getRandomBooks(count = 20) {
        try {
            const books = await prisma.book.findMany({
                take: count,
                select: {
                    id: true,
                    title: true,
                    author: true,
                    category: true
                }
            });
            return books;
        } catch (error) {
            console.error('Error fetching books:', error);
            return [];
        }
    }


    getRandomOpinion() {
        return this.opinions[Math.floor(Math.random() * this.opinions.length)];
    }

    generatePostText(template, book) {
        const opinion = this.getRandomOpinion();
        
        let text = template
            .replace(/{bookTitle}/g, book.title)
            .replace(/{author}/g, book.author)
            .replace(/{genre}/g, book.category)
            .replace(/{opinion}/g, opinion)
            .replace(/{page}/g, Math.floor(Math.random() * 300) + 50);

        return text;
    }

    async createPost(userId, availableBooks = []) {
        const postType = this.postTemplates[Math.floor(Math.random() * this.postTemplates.length)];
        const template = postType.templates[Math.floor(Math.random() * postType.templates.length)];
        
        let bookId = null;
        let book = null;
        
        if (availableBooks.length > 0) {
            book = availableBooks[Math.floor(Math.random() * availableBooks.length)];
            bookId = book.id;
        }
        
        const text = book ? this.generatePostText(template, book) : template;
        
        try {
            const post = await prisma.post.create({
                data: {
                    userId,
                    text,
                    bookId,
                    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
                }
            });
            return post;
        } catch (error) {
            console.error('Error creating post:', error);
            return null;
        }
    }

    async initializePosts(count = 50, force = false) {
        try {
            console.log('Starting posts initialization process...');

            if (!force) {
                const existingPosts = await prisma.post.count();
                if (existingPosts > 0) {
                    console.log('Posts already exist in database. Use --force to override.');
                    return { message: 'Posts already exist', count: 0 };
                }
            }

            const users = await this.getRandomUsers(20);
            if (users.length === 0) {
                console.log('No users found. Please initialize users first.');
                return { message: 'No users found', count: 0 };
            }

            const books = await this.getRandomBooks(30);
            console.log(`Found ${users.length} users and ${books.length} books to create posts for`);

            const posts = [];
            for (let i = 0; i < count; i++) {
                const randomUser = users[Math.floor(Math.random() * users.length)];
                const post = await this.createPost(randomUser.id, books);
                if (post) {
                    posts.push(post);
                }
            }

            console.log(`Successfully created ${posts.length} posts`);

            return {
                message: 'Posts initialized successfully',
                count: posts.length,
                posts: posts.slice(0, 5) // Return first 5 as example
            };
        } catch (error) {
            console.error('Error initializing posts:', error);
            throw error;
        }
    }

    async clearTestPosts() {
        try {
            console.log('Clearing test posts...');
            const deleted = await prisma.post.deleteMany({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Posts from last 24 hours
                    }
                }
            });
            console.log(`Deleted ${deleted.count} test posts`);
            return { message: 'Test posts cleared', count: deleted.count };
        } catch (error) {
            console.error('Error clearing test posts:', error);
            throw error;
        }
    }
}

async function main() {
    const args = process.argv.slice(2);
    const count = parseInt(args.find(arg => arg.startsWith('--count='))?.split('=')[1]) || 50;
    const force = args.includes('--force');
    const clear = args.includes('--clear');

    const initializer = new PostsInitializer();

    try {
        if (clear) {
            await initializer.clearTestPosts();
        } else {
            const result = await initializer.initializePosts(count, force);
            console.log('Result:', result);
        }
    } catch (error) {
        console.error('Script failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
}

module.exports = PostsInitializer;
