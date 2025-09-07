const { AX } = require('../core/http');

class HttpService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
    }

    async getWithCache(url, options = {}, retries = 2) {
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const response = await AX.get(url, {
                    timeout: 15000, // Increased from 5000ms to 15000ms (15 seconds)
                    ...options,
                });

                this.cache.set(cacheKey, {
                    data: response.data,
                    timestamp: Date.now(),
                });

                return response.data;
            } catch (error) {
                const isLastAttempt = attempt === retries;
                const isTimeoutError = error.code === 'ECONNABORTED' || error.message.includes('timeout');
                
                if (isLastAttempt) {
                    console.warn(`HTTP request failed for ${url} after ${retries + 1} attempts:`, error.message);
                    throw error;
                }
                
                if (isTimeoutError) {
                    console.warn(`HTTP request timeout for ${url}, attempt ${attempt + 1}/${retries + 1}, retrying...`);
                    // Wait before retrying (exponential backoff)
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                } else {
                    // For non-timeout errors, don't retry
                    console.warn(`HTTP request failed for ${url}:`, error.message);
                    throw error;
                }
            }
        }
    }

    async getOpenLibrarySubjects(subjects, limit = 10) {
        const promises = subjects.map((subject) =>
            this.getWithCache(`https://openlibrary.org/subjects/${subject}`, {
                params: { limit },
            }, 2) // Use 2 retries for OpenLibrary requests
            .catch((error) => {
                console.warn(`Failed to fetch ${subject} after all retries:`, error.message);
                return { works: [] };
            })
        );

        const results = await Promise.allSettled(promises);
        return results
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value);
    }

    async getNYTBooks() {
        try {
            return await this.getWithCache(
                'https://api.nytimes.com/svc/books/v3/lists/current/hardcover-fiction.json',
                {
                    params: { 'api-key': process.env.NYT_KEY },
                },
                2 // Use 2 retries for NYT requests
            );
        } catch (error) {
            console.warn('NYT API failed after all retries:', error.message);
            return { results: { books: [] } };
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = new HttpService();
