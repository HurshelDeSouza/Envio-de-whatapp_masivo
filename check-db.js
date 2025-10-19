const Database = require('better-sqlite3');
const db = new Database('./database/groups.db');

console.log('='.repeat(60));
console.log('ESTRUCTURA DE LA TABLA groups');
console.log('='.repeat(60));

const info = db.prepare('PRAGMA table_info(groups)').all();
info.forEach(col => {
    console.log(`${col.cid}. ${col.name.padEnd(20)} (${col.type.padEnd(10)}) - Default: ${col.dflt_value || 'NULL'}`);
});

console.log('\n' + '='.repeat(60));
console.log('ESTADÍSTICAS DE LA BASE DE DATOS');
console.log('='.repeat(60));

const stats = db.prepare(`
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) as verificados,
        SUM(CASE WHEN requires_approval = 1 THEN 1 ELSE 0 END) as requieren_aprobacion,
        SUM(CASE WHEN status = 'successful' THEN 1 ELSE 0 END) as exitosos,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fallidos,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendientes
    FROM groups
`).get();

console.log('\nTotal de grupos:', stats.total);
console.log('Grupos verificados:', stats.verificados);
console.log('Requieren aprobación:', stats.requieren_aprobacion);
console.log('Grupos exitosos:', stats.exitosos);
console.log('Grupos fallidos:', stats.fallidos);
console.log('Grupos pendientes:', stats.pendientes);

console.log('\n' + '='.repeat(60));
console.log('CAMBIOS REALIZADOS EN LA BASE DE DATOS');
console.log('='.repeat(60));

console.log('\n✅ COLUMNAS AGREGADAS:');
console.log('   13. verified (INTEGER) - Default: 0');
console.log('       → Indica si el enlace fue verificado');
console.log('       → 0 = No verificado, 1 = Verificado');
console.log('');
console.log('   14. requires_approval (INTEGER) - Default: 0');
console.log('       → Indica si requiere aprobación del admin');
console.log('       → 0 = Unión directa, 1 = Requiere aprobación');

console.log('\n📊 COLUMNAS ORIGINALES (Sin cambios):');
console.log('   0-12: id, link, name, country, country_origin, members,');
console.log('         admin_permission, status, group_id, error_message,');
console.log('         created_at, joined_at, updated_at');

console.log('\n' + '='.repeat(60));
console.log('EJEMPLO DE GRUPOS VERIFICADOS');
console.log('='.repeat(60));

const verifiedGroups = db.prepare(`
    SELECT name, country, members, verified, requires_approval, status
    FROM groups
    WHERE verified = 1
    LIMIT 5
`).all();

if (verifiedGroups.length > 0) {
    verifiedGroups.forEach((g, i) => {
        console.log(`\n${i + 1}. ${g.name || 'Sin nombre'}`);
        console.log(`   País: ${g.country}`);
        console.log(`   Miembros: ${g.members}`);
        console.log(`   Verificado: ${g.verified === 1 ? 'Sí' : 'No'}`);
        console.log(`   Requiere aprobación: ${g.requires_approval === 1 ? 'Sí' : 'No'}`);
        console.log(`   Estado: ${g.status}`);
    });
} else {
    console.log('\nNo hay grupos verificados aún.');
}

db.close();
console.log('\n' + '='.repeat(60));
