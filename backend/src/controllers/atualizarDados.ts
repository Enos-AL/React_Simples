import { Request, Response } from 'express';
import { connectToDatabase, pool, getColunasProtegidas } from '../config/bd';

export async function buscarUsuario(req: Request, res: Response): Promise<void> {
  const { coluna, valor } = req.body;

  // Verifica se os parâmetros obrigatórios foram passados
  if (!coluna || !valor) {
    res.status(400).json({ error: 'Informe a Coluna e o valor do usuário.' });
    return;
  }

  try {

    const poolConnection = pool || await connectToDatabase(); // Conecta ou usa a conexão existente

    // Montando a query dinâmica com a coluna e valor fornecidos
    const query = `
      SELECT *
      FROM Chamados
      WHERE ${coluna} LIKE @valor
    `;

    // Executa a query com o valor, usando '%' para buscar por correspondências parciais
    const resultado = await poolConnection.request()
      .input('valor', `%${valor}%`)  // Permite buscar qualquer valor que contenha o input (busca parcial)
      .query(query);

    // Verifica se encontrou resultados
    if (resultado.recordset.length === 0) {
      res.status(404).json({ message: 'Nenhum registro encontrado.' });
    } else {
      res.status(200).json({ message: 'Registros encontrados com sucesso', dados: resultado.recordset });
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao buscar usuário: ${error.message}`);
      res.status(500).json({ error: `Erro ao buscar usuário: ${error.message}` });
    } else {
      console.error('Erro desconhecido ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro desconhecido ao buscar usuário.' });
    }
  }
}








interface Coluna {
  COLUMN_NAME: string;
}

async function verificarCriarTabelaAtualizacao(poolConnection: any): Promise<void> {
  const queryVerificaTabela = `
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'atualizacaoDeDados')
        BEGIN
            CREATE TABLE atualizacaoDeDados (
                id INT IDENTITY(1,1) PRIMARY KEY,  -- Coluna de identidade
                id_U NVARCHAR(MAX), 
                Nome_U NVARCHAR(255),
                Dia DATE NOT NULL,
                Hora TIME NOT NULL,
                Tabela NVARCHAR(255) NOT NULL,
                Ação NVARCHAR(255) NOT NULL
            )
        END;
    `;
  await poolConnection.query(queryVerificaTabela);
}

async function verificarCriarColunasChamados(poolConnection: any): Promise<void> {
  const colunasChamados = await poolConnection.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Chamados'
  `);

  const nomesColunasChamados = colunasChamados.recordset.map((col: Coluna) => col.COLUMN_NAME);

  const colunasAtualizacao = await poolConnection.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'atualizacaoDeDados'
  `);

  const nomesColunasAtualizacao = colunasAtualizacao.recordset.map((col: Coluna) => col.COLUMN_NAME);

  const colunasFaltando = nomesColunasChamados.filter((col: string) => !nomesColunasAtualizacao.includes(col));

  if (colunasFaltando.length > 0) {
    for (const coluna of colunasFaltando) {
      await poolConnection.request().query(`
        ALTER TABLE atualizacaoDeDados
        ADD [${coluna}] NVARCHAR(MAX)
      `);
    }
    console.log('Colunas da tabela Chamados adicionadas na tabela "atualizacaoDeDados".');
  } else {
    console.log('Todas as colunas da tabela Chamados já estão presentes na tabela "atualizacaoDeDados".');
  }
}

async function verificarCriarColunasEspecificas(poolConnection: any): Promise<void> {
  const colunasAtualizacao = await poolConnection.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'atualizacaoDeDados'
  `);

  const nomesColunasAtualizacao = colunasAtualizacao.recordset.map((col: Coluna) => col.COLUMN_NAME);

  const colunasEspecificas = ['id_U', 'Nome_U', 'Dia', 'Hora'];
  const colunasEspecificasFaltando = colunasEspecificas.filter((col: string) => !nomesColunasAtualizacao.includes(col));

  if (colunasEspecificasFaltando.length > 0) {
    for (const coluna of colunasEspecificasFaltando) {
      await poolConnection.request().query(`
        ALTER TABLE atualizacaoDeDados
        ADD [${coluna}] NVARCHAR(MAX)
      `);
    }
    console.log('Colunas específicas adicionadas na tabela "atualizacaoDeDados".');
  } else {
    console.log('Colunas específicas já existem na tabela "atualizacaoDeDados".');
  }
}

// Função para registrar atualizações na tabela 'atualizacaoDeDados'
async function registrarAtualizacao(
  poolConnection: any, 
  id_U: number | null, 
  nome_U: string | null, 
  tabela: string, 
  acao: string, 
  dadosExistentes: any
): Promise<void> {
  // Remover o campo 'id' dos dados que serão inseridos
  const dadosSemId = { ...dadosExistentes };
  delete dadosSemId['id'];  // Exclui o campo 'id' para evitar o erro de IDENTITY_INSERT

  const queryInsercao = `
      INSERT INTO atualizacaoDeDados (id_U, Nome_U, Dia, Hora, Tabela, Ação, ${Object.keys(dadosSemId).map(col => `[${col}]`).join(', ')})
      VALUES (@id_U, @nome_U, @dia, @hora, @tabela, @acao, ${Object.keys(dadosSemId).map(col => `@${col}`).join(', ')})
  `;

  const request = poolConnection.request();
  request.input('id_U', id_U || null);
  request.input('nome_U', nome_U || null);
  request.input('dia', new Date().toISOString().split('T')[0]);  // Insere a data atual no formato YYYY-MM-DD
  request.input('hora', new Date().toTimeString().split(' ')[0]);  // Insere a hora atual no formato HH:MM:SS
  request.input('tabela', tabela);
  request.input('acao', acao);

  // Adiciona os dados existentes como parâmetros, exceto o 'id'
  Object.keys(dadosSemId).forEach(coluna => {
    request.input(coluna, dadosSemId[coluna]);
  });

  await request.query(queryInsercao);
}


export async function atualizarDados(req: Request, res: Response): Promise<void> {
  const { id, nome, coluna, senha, dados } = req.body;

  if (!id && (!nome || !coluna)) {
    res.status(400).json({ error: 'Para realizar a atualização, forneça um ID ou um nome com a coluna correspondente.' });
    return;
  }

  try {
    if (!dados || Object.keys(dados).length === 0) {
      res.status(400).json({ error: 'Dados inválidos ou não fornecidos.' });
      return;
    }

    const poolConnection = pool || await connectToDatabase();
    await verificarCriarTabelaAtualizacao(poolConnection);
    await verificarCriarColunasChamados(poolConnection);
    await verificarCriarColunasEspecificas(poolConnection);

    const colunasProtegidas = getColunasProtegidas();
    const senhaProtegida = process.env.PERMISSAO_SENHA_PROTEGIDA;

    const colunasModificadas = Object.keys(dados);
    const colunasRestritasModificadas = colunasProtegidas.filter((coluna: string) => colunasModificadas.includes(coluna));

    if (colunasRestritasModificadas.length > 0) {
      if (!senha || senha !== senhaProtegida) {
        const agora = new Date();

        const insertAcessoNegadoRequest = await poolConnection.request();
        insertAcessoNegadoRequest.input('idU', id ? id : nome);
        await insertAcessoNegadoRequest.query(`
          INSERT INTO atualizacaoDeDados (id_U, Dia, Hora)
          VALUES (@idU, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME))
        `);

        res.status(403).json({
          error: `Acesso negado. Senha necessária para alterar as colunas protegidas: ${colunasRestritasModificadas.join(', ')}`
        });
        return;
      }
    }

    const agora = new Date();
    dados.SAC = 'Atualizado';
    dados.DeAC = agora.toISOString().slice(0, 19).replace('T', ' ');

    // Verificar tipo de coluna para garantir compatibilidade de tipos
    const colunaTipoQuery = await poolConnection.request().input('coluna', coluna).query(`
      SELECT DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Chamados' AND COLUMN_NAME = @coluna
    `);

    const colunaTipo = colunaTipoQuery.recordset[0]?.DATA_TYPE;

    if (!colunaTipo) {
      res.status(400).json({ error: `A coluna ${coluna} não foi encontrada.` });
      return;
    }

    // Verificar se o tipo da coluna é compatível com a busca pelo nome
    if (colunaTipo !== 'nvarchar' && colunaTipo !== 'varchar') {
      res.status(400).json({ error: `A coluna ${coluna} não é do tipo adequado para busca por nome.` });
      return;
    }

    let selectQuery = 'SELECT * FROM Chamados WHERE ';
    const selectRequest = await poolConnection.request();

    if (id) {
      selectQuery += 'id = @id';
      selectRequest.input('id', id);
    } else {
      selectQuery += `${coluna} = @nome`;
      selectRequest.input('nome', nome);
    }

    const selectResult = await selectRequest.query(selectQuery);

    if (selectResult.recordset.length === 0) {
      res.status(404).json({ message: 'Registro não encontrado.' });
      return;
    }

    const dadosExistentes = selectResult.recordset[0];

    // Registrar os dados antigos na tabela de atualizações antes de atualizar
    await registrarAtualizacao(poolConnection, id || null, nome || null, 'Chamados', 'Atualização', dadosExistentes);

    // Atualizar os dados na tabela Chamados
    const updateQuery = `
      UPDATE Chamados
      SET ${Object.keys(dados).map(coluna => `[${coluna}] = @${coluna}`).join(', ')}
      WHERE ${id ? 'id = @id' : `${coluna} = @nome`}
    `;

    const updateRequest = poolConnection.request();
    Object.keys(dados).forEach(coluna => updateRequest.input(coluna, dados[coluna]));
    if (id) {
      updateRequest.input('id', id);
    } else {
      updateRequest.input('nome', nome);
    }

    await updateRequest.query(updateQuery);

    res.status(200).json({ message: 'Dados atualizados com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar dados:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}
