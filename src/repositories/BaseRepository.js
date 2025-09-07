const { PrismaClient } = require('@prisma/client');

/**
 * Base Repository class that provides common database operations
 * Implements the Repository pattern for data access abstraction
 */
class BaseRepository {
    constructor(model) {
        this.model = model;
        this.prisma = new PrismaClient();
    }

    /**
     * Find a record by ID
     * @param {number|string} id - The ID to search for
     * @param {object} options - Additional options for the query
     * @returns {Promise<object|null>} The found record or null
     */
    async findById(id, options = {}) {
        try {
            return await this.prisma[this.model].findUnique({
                where: { id },
                ...options,
            });
        } catch (error) {
            throw new Error(`Error finding ${this.model} by ID: ${error.message}`);
        }
    }

    /**
     * Find a record by a specific field
     * @param {object} where - The where clause
     * @param {object} options - Additional options for the query
     * @returns {Promise<object|null>} The found record or null
     */
    async findOne(where, options = {}) {
        try {
            return await this.prisma[this.model].findFirst({
                where,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error finding ${this.model}: ${error.message}`);
        }
    }

    /**
     * Find multiple records
     * @param {object} where - The where clause
     * @param {object} options - Additional options for the query
     * @returns {Promise<Array>} Array of found records
     */
    async findMany(where = {}, options = {}) {
        try {
            return await this.prisma[this.model].findMany({
                where,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error finding ${this.model} records: ${error.message}`);
        }
    }

    /**
     * Create a new record
     * @param {object} data - The data to create
     * @param {object} options - Additional options for the query
     * @returns {Promise<object>} The created record
     */
    async create(data, options = {}) {
        try {
            return await this.prisma[this.model].create({
                data,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error creating ${this.model}: ${error.message}`);
        }
    }

    /**
     * Update a record by ID
     * @param {number|string} id - The ID to update
     * @param {object} data - The data to update
     * @param {object} options - Additional options for the query
     * @returns {Promise<object>} The updated record
     */
    async updateById(id, data, options = {}) {
        try {
            return await this.prisma[this.model].update({
                where: { id },
                data,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error updating ${this.model}: ${error.message}`);
        }
    }

    /**
     * Update multiple records
     * @param {object} where - The where clause
     * @param {object} data - The data to update
     * @param {object} options - Additional options for the query
     * @returns {Promise<object>} The update result
     */
    async updateMany(where, data, options = {}) {
        try {
            return await this.prisma[this.model].updateMany({
                where,
                data,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error updating ${this.model} records: ${error.message}`);
        }
    }

    /**
     * Delete a record by ID
     * @param {number|string} id - The ID to delete
     * @param {object} options - Additional options for the query
     * @returns {Promise<object>} The deleted record
     */
    async deleteById(id, options = {}) {
        try {
            return await this.prisma[this.model].delete({
                where: { id },
                ...options,
            });
        } catch (error) {
            throw new Error(`Error deleting ${this.model}: ${error.message}`);
        }
    }

    /**
     * Delete multiple records
     * @param {object} where - The where clause
     * @param {object} options - Additional options for the query
     * @returns {Promise<object>} The delete result
     */
    async deleteMany(where, options = {}) {
        try {
            return await this.prisma[this.model].deleteMany({
                where,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error deleting ${this.model} records: ${error.message}`);
        }
    }

    /**
     * Count records
     * @param {object} where - The where clause
     * @param {object} options - Additional options for the query
     * @returns {Promise<number>} The count of records
     */
    async count(where = {}, options = {}) {
        try {
            return await this.prisma[this.model].count({
                where,
                ...options,
            });
        } catch (error) {
            throw new Error(`Error counting ${this.model} records: ${error.message}`);
        }
    }

    /**
     * Check if a record exists
     * @param {object} where - The where clause
     * @returns {Promise<boolean>} True if record exists, false otherwise
     */
    async exists(where) {
        try {
            const count = await this.count(where);
            return count > 0;
        } catch (error) {
            throw new Error(`Error checking existence of ${this.model}: ${error.message}`);
        }
    }

    /**
     * Close the Prisma connection
     */
    async disconnect() {
        await this.prisma.$disconnect();
    }
}

module.exports = BaseRepository;
