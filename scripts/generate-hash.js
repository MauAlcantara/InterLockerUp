const bcrypt = require('bcrypt');

// Contraseña por defecto (puedes sobrescribirla al ejecutar el script)
const password = process.argv[2] || 'Admin123456!';

async function generateHash() {
  try {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('\n✅ Hash generado correctamente:');
    console.log(`\n${hash}`);
    console.log('\n📋 Ejemplo de comando SQL:');
    console.log(`INSERT INTO users (email, password, rol, matricula, nombre_completo) VALUES ('admin@uteq.edu.mx', '${hash}', 'admin', 'ADMIN001', 'Administrador UTEQ');`);
    console.log('\n⚠️ Asegúrate de que la tabla "users" tenga las columnas necesarias.');
  } catch (error) {
    console.error('❌ Error al generar el hash:', error.message);
  }
}

generateHash();
