const { AX } = require('../core/http');

class HttpService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    async getWithCache(url, options = {}) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await AX.get(url, {
                timeout: 5000,
                ...options
            });
            
            this.cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
            
            return response.data;
        } catch (error) {
            console.warn(`HTTP request failed for ${url}:`, error.message);
            throw error;
        }
    }

    async getOpenLibrarySubjects(subjects, limit = 10) {
        const promises = subjects.map(subject =>
            this.getWithCache(`https://openlibrary.org/subjects/${subject}`, {
                params: { limit }
            }).catch(error => {
                console.warn(`Failed to fetch ${subject}:`, error.message);
                return { works: [] };
            })
        );

        const results = await Promise.allSettled(promises);
        return results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);
    }

    async getNYTBooks() {
        try {
            return await this.getWithCache('https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json', {
                params: { 'api-key': process.env.NYT_KEY }
            });
        } catch (error) {
            console.warn('NYT API failed:', error.message);
            return { results: { books: [] } };
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = new HttpService();
