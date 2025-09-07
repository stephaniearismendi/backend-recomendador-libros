#!/usr/bin/env node

/**
 * Migration script to update import statements in existing files
 * This script helps migrate from the old structure to the new refactored structure
 */

const fs = require('fs');
const path = require('path');

// Define the mapping of old imports to new imports
const importMappings = {
    // Controllers
    '../controllers/userController': '../controllers/UserController',
    '../controllers/bookController': '../controllers/BookController',
    
    // Services
    '../services/userService': '../services/UserService',
    '../services/bookService': '../services/BookService',
    
    // Repositories
    '../repositories/userRepository': '../repositories/UserRepository',
    '../repositories/bookRepository': '../repositories/BookRepository',
    
    // Config
    './config/database': '../config',
    './config/jwt': '../config',
    
    // DTOs
    '../dtos/userDTO': '../dtos/UserDTO',
    '../dtos/bookDTO': '../dtos/BookDTO',
    
    // Validators
    '../validators/validator': '../validators/Validator',
    '../validators/validationSchemas': '../validators/validationSchemas',
};

// Function to update imports in a file
function updateImportsInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;
        
        // Update require statements
        for (const [oldImport, newImport] of Object.entries(importMappings)) {
            const oldRequire = `require('${oldImport}')`;
            const newRequire = `require('${newImport}')`;
            
            if (content.includes(oldRequire)) {
                content = content.replace(new RegExp(oldRequire.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newRequire);
                updated = true;
            }
        }
        
        // Update import statements (ES6)
        for (const [oldImport, newImport] of Object.entries(importMappings)) {
            const oldImportStatement = `from '${oldImport}'`;
            const newImportStatement = `from '${newImport}'`;
            
            if (content.includes(oldImportStatement)) {
                content = content.replace(new RegExp(oldImportStatement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newImportStatement);
                updated = true;
            }
        }
        
        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Updated imports in: ${filePath}`);
        }
        
    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
    }
}

// Function to recursively find and update files
function updateFilesInDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            updateFilesInDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.ts'))) {
            updateImportsInFile(fullPath);
        }
    }
}

// Main execution
function main() {
    console.log('🚀 Starting import migration...');
    
    const srcPath = path.join(__dirname, '..', 'src');
    
    if (!fs.existsSync(srcPath)) {
        console.error('❌ src directory not found');
        process.exit(1);
    }
    
    updateFilesInDirectory(srcPath);
    
    console.log('✅ Import migration completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Review the updated files');
    console.log('2. Test the application');
    console.log('3. Update any remaining manual imports');
    console.log('4. Run tests to ensure everything works');
}

// Run the migration
if (require.main === module) {
    main();
}

module.exports = {
    updateImportsInFile,
    updateFilesInDirectory,
    importMappings,
};
