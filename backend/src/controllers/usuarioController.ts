// src/controllers/usuarioController.ts
import { Request, Response } from 'express';
import { pool, sql } from '../config/bd';

// Listar todos os usuários
export async function listarUsuarios(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.request().query('SELECT * FROM Usuarios');
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
}

// Criar um novo usuário
export async function criarUsuario(req: Request, res: Response): Promise<void> {
  const dados = req.body;

  try {
    // Verificar as colunas disponíveis
    const columnsResult = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);

    const nomesColunas = columnsResult.recordset.map((coluna: any) => coluna.COLUMN_NAME);
    const chaves = Object.keys(dados);
    const colunasValidas = chaves.every(chave => nomesColunas.includes(chave));

    if (!colunasValidas) {
      res.status(400).json({ error: 'Dados fornecidos incluem colunas inválidas' });
      return;
    }

    // Construir a query de inserção dinamicamente
    const colunasQuery = chaves.join(', ');
    const valoresQuery = chaves.map(() => '@p').join(', ');
    const valores = chaves.reduce((obj, chave, index) => {
      obj[`p${index}`] = dados[chave];
      return obj;
    }, {} as any);

    const query = `INSERT INTO Usuarios (${colunasQuery}) VALUES (${valoresQuery})`;
    await pool.request().query(query, valores);
    res.status(201).json({ message: 'Usuário criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
}

// Excluir um usuário existente
export async function excluirUsuario(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const result = await pool.request()
      .input('id', id)
      .query('DELETE FROM Usuarios WHERE id = @id');

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'Usuário excluído com sucesso' });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
}


// Listar todas as colunas da tabela 'Usuarios'
export async function listarColunas(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Erro ao listar colunas:', error);
    res.status(500).json({ error: 'Erro ao listar colunas' });
  }
}


// Inserir dados dinamicamente com base nas colunas disponíveis
export async function inserirDados(req: Request, res: Response): Promise<void> {
  const { dados } = req.body; // dados deve ser um objeto com chaves correspondentes às colunas

  try {
    // Verificar as colunas disponíveis
    const result = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);

    const nomesColunas = result.recordset.map((coluna: any) => coluna.COLUMN_NAME);
    const chaves = Object.keys(dados);
    const colunasValidas = chaves.every(chave => nomesColunas.includes(chave));

    if (!colunasValidas) {
      res.status(400).json({ error: 'Dados fornecidos incluem colunas inválidas' });
      return;
    }

    // Construir a query de inserção dinamicamente
    const colunasQuery = chaves.join(', ');
    const valoresQuery = chaves.map(() => '@p').join(', ');
    const valores = chaves.map(chave => ({ name: chave, type: sql.VarChar, value: dados[chave] }));

    const query = `INSERT INTO Usuarios (${colunasQuery}) VALUES (${valoresQuery})`;
    const request = pool.request();

    valores.forEach(param => request.input(param.name, param.type, param.value));

    const insertResult = await request.query(query);
    res.status(201).json({ id: insertResult.recordset[0].id });
  } catch (error) {
    console.error('Erro ao inserir dados:', error);
    res.status(500).json({ error: 'Erro ao inserir dados' });
  }
}

// Atualizar dados dinamicamente com base no ID
export async function atualizarDados(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { dados } = req.body; // dados deve ser um objeto com chaves correspondentes às colunas

  try {
    // Verificar as colunas disponíveis
    const result = await pool.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);

    const nomesColunas = result.recordset.map((coluna: any) => coluna.COLUMN_NAME);
    const chaves = Object.keys(dados);
    const colunasValidas = chaves.every(chave => nomesColunas.includes(chave));

    if (!colunasValidas) {
      res.status(400).json({ error: 'Dados fornecidos incluem colunas inválidas' });
      return;
    }

    // Construir a query de atualização dinamicamente
    const atualizacoes = chaves.map(chave => `${chave} = @${chave}`).join(', ');
    const request = pool.request();
    chaves.forEach(chave => request.input(chave, dados[chave]));
    request.input('id', id);

    const updateResult = await request.query(`UPDATE Usuarios SET ${atualizacoes} WHERE id = @id`);
    if (updateResult.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'Dados atualizados com sucesso' });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao atualizar dados:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados' });
  }
}
