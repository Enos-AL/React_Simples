import dotenv from 'dotenv';
import path from 'path';
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const bdConfig = {
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || '',
  database: process.env.DB_NAME || '',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: parseInt(process.env.DB_PORT || '1433', 10),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000, // 30 segundos
};

let pool: sql.ConnectionPool;  // Tipagem do pool

export async function connectToDatabase(): Promise<sql.ConnectionPool> {
  try {
    pool = await sql.connect(bdConfig);
    console.log('Conectado ao banco de dados.');
    return pool;
  } catch (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    throw err;
  }
}

export { sql, pool }; // Exportando o pool e o sql
