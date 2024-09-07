import sql from 'mssql';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

/**
 * Função auxiliar para pegar variáveis de ambiente, com valor padrão caso não esteja definida.
 */
function getEnvVariable(name: string, defaultValue: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`A variável de ambiente ${name} não está definida. Usando valor padrão.`);
    return defaultValue;
  }
  return value;
}

/**
 * Configurações do banco de dados e conexão.
 */
const bdConfig = {
  user: getEnvVariable('DB_USER', ''),
  password: getEnvVariable('DB_PASSWORD', ''),
  server: getEnvVariable('DB_SERVER', ''),
  database: getEnvVariable('DB_NAME', ''),
  senhaProtegida: getEnvVariable('PERMISSAO_SENHA_PROTEGIDA', ''),
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  port: parseInt(getEnvVariable('DB_PORT', '1433'), 10),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000, // 30 segundos
};

/**
 * Captura as colunas protegidas a partir da variável de ambiente.
 */
export function getColunasProtegidas(): string[] {
  const colunas = process.env.PROTECTED_COLUMNS || ''; // Verifica se está definida
  return colunas.split(',').map(coluna => coluna.trim()); // Divide e remove espaços
}

let pool: sql.ConnectionPool;  // Tipagem do pool

/**
 * Função para conectar ao banco de dados.
 * @returns {Promise<sql.ConnectionPool>} Pool de conexão ao banco.
 */
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
