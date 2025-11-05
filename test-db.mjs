import mysql from 'mysql2/promise';

const config = {
  host: 'crypto_bot_db.mysql.dbaas.com.br',
  user: 'crypto_bot_db',
  password: 'Gabi2205#',
  database: 'crypto_bot_db',
  port: 3306,
};

console.log('Testando conexão com banco de dados...');
console.log('Host:', config.host);
console.log('User:', config.user);

try {
  const connection = await mysql.createConnection(config);
  console.log('✅ Conexão bem-sucedida!');
  
  const [rows] = await connection.query('SELECT 1 as test');
  console.log('✅ Query executada com sucesso:', rows);
  
  await connection.end();
} catch (error) {
  console.error('❌ Erro na conexão:', error.message);
  console.error('Código:', error.code);
}
