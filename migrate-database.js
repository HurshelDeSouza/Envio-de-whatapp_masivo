/**
 * Script de migración para agregar nuevas columnas a la base de datos
 */

const Database = require('better-sqlite3');
const path = require('path');

console.log('='.repeat(60));
console.log('🔄 Migración de Base de Datos');
console.log('='.repeat(60));

try {
    const dbPath = path.join(__dirname, 'database/groups.db');
    const db = new Database(dbPath);
    
    console.log('\n📂 Base de datos: ' + dbPath);
    
    // Verificar si las columnas ya existen
    const tableInfo = db.prepare("PRAGMA table_info(groups)").all();
    const columnNames = tableInfo.map(col => col.name);
    
    console.log('\n📋 Columnas actuales:', columnNames.join(', '));
    
    let changes = 0;
    
    // Agregar columna 'verified' si no existe
    if (!columnNames.includes('verified')) {
        console.log('\n➕ Agregando columna "verified"...');
        db.exec('ALTER TABLE groups ADD COLUMN verified INTEGER DEFAULT 0');
        changes++;
        console.log('   ✅ Columna "verified" agregada');
    } else {
        console.log('\n✓ Columna "verified" ya existe');
    }
    
    // Agregar columna 'requires_approval' si no existe
    if (!columnNames.includes('requires_approval')) {
        console.log('\n➕ Agregando columna "requires_approval"...');
        db.exec('ALTER TABLE groups ADD COLUMN requires_approval INTEGER DEFAULT 0');
        changes++;
        console.log('   ✅ Columna "requires_approval" agregada');
    } else {
        console.log('\n✓ Columna "requires_approval" ya existe');
    }
    
    // Mostrar estructura actualizada
    const updatedTableInfo = db.prepare("PRAGMA table_info(groups)").all();
    console.log('\n📋 Columnas después de la migración:');
    updatedTableInfo.forEach(col => {
        console.log(`   - ${col.name} (${col.type})`);
    });
    
    db.close();
    
    if (changes > 0) {
        console.log('\n✅ Migración completada exitosamente!');
        console.log(`   Se agregaron ${changes} columna(s) nueva(s)`);
    } else {
        console.log('\n✅ Base de datos ya está actualizada');
    }
    
} catch (error) {
    console.error('\n❌ Error en la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
}
