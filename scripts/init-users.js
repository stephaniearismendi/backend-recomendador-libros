#!/usr/bin/env node

const userSeeder = require('../src/services/userSeeder');

async function initializeUsers() {
    try {
        console.log('🚀 Adding more users to the application...');
        
        // Siempre crear 20 usuarios adicionales
        console.log('🌱 Seeding 20 additional random users...');
        const result = await userSeeder.seedUsers(20, true); // force = true
        
        console.log('✅ User seeding completed!');
        console.log(`📊 Created ${result.count} new users`);
        
        if (result.users && result.users.length > 0) {
            console.log('👥 New users created:');
            result.users.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.name} (@${user.username})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error seeding users:', error.message);
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    initializeUsers()
        .then(() => {
            console.log('🎉 Initialization script completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Initialization script failed:', error);
            process.exit(1);
        });
}

module.exports = initializeUsers;
