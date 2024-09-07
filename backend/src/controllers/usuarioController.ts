// src/controllers/usuarioController.ts
import { connectToDatabase, pool} from '../config/bd'; // Verifique o caminho correto
import { Request, Response } from 'express';
import { sql } from '../config/bd';

// Atualizar dados dinamicamente com base no ID
export async function atualizarDados(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { dados } = req.body;

  try {
    const poolConnection = pool || await connectToDatabase(); // Conecta ou usa a conexão existente

    const result = await poolConnection.request().query(`
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

    const atualizacoes = chaves.map(chave => `${chave} = @${chave}`).join(', ');
    const request = poolConnection.request();

    chaves.forEach(chave => request.input(chave, dados[chave]));
    request.input('id', id);

    const updateResult = await request.query(`UPDATE Usuarios SET ${atualizacoes} WHERE id = @id`);
    if (updateResult.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'Dados atualizados com sucesso' });
    } else {
      res.status(404).json({ message: 'Usuário não encontrado' });
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao atualizar dados: ${error.message}`);
      res.status(500).json({ error: `Erro ao atualizar dados: ${error.message}` });
    } else {
      console.error('Erro desconhecido ao atualizar dados:', error);
      res.status(500).json({ error: 'Erro desconhecido ao atualizar dados.' });
    }
  }
}

// Excluir um usuário existente pelo nome
export async function excluirUsuario(req: Request, res: Response): Promise<void> {
  const { nome } = req.params;

  try {
    const result = await pool.request()
      .input('nome', sql.VarChar, nome)  // Definindo o parâmetro 'nome' na query
      .query('DELETE FROM Usuarios WHERE Nome = @nome');  // Excluindo pelo nome

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
    const poolConnection = pool || await connectToDatabase(); // Conecta ou usa a conexão existente

    const result = await poolConnection.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao listar colunas: ${error.message}`);
      res.status(500).json({ error: `Erro ao listar colunas: ${error.message}` });
    } else {
      console.error('Erro desconhecido ao listar colunas:', error);
      res.status(500).json({ error: 'Erro desconhecido ao listar colunas.' });
    }
  }
}

// Excluindo uma Coluna pelo nome
export async function excluirColunas(req: Request, res: Response): Promise<void> {
  const { colunasParaExcluir, confirmarExclusao } = req.body;

  try {
    const poolConnection = pool || await connectToDatabase(); // Conecta ou usa a conexão existente

    // Obtém os nomes das colunas existentes na tabela
    const result = await poolConnection.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);

    const nomesColunasExistentes = result.recordset.map((coluna: any) => coluna.COLUMN_NAME.toLowerCase());

    for (const coluna of colunasParaExcluir) {
      const nomeColunaLower = coluna.toLowerCase();
      
      // Verifica se a coluna existe
      if (!nomesColunasExistentes.includes(nomeColunaLower)) {
        res.status(400).json({ error: `A coluna "${coluna}" não existe na tabela.` });
        return;
      }

      // Conta o número de registros não nulos na coluna para avaliar o risco
      const contaDados = await poolConnection.request().query(`
        SELECT COUNT(${coluna}) AS total FROM Usuarios WHERE ${coluna} IS NOT NULL
      `);

      const numeroDeDados = contaDados.recordset[0].total;

      // Se a coluna possui dados e o usuário não confirmou a exclusão
      if (numeroDeDados > 0 && !confirmarExclusao) {
        res.status(400).json({
          warning: `A coluna "${coluna}" possui ${numeroDeDados} registros. Excluir essa coluna resultará na perda de dados. Tem certeza de que deseja prosseguir?`,
          confirmarExclusao: false
        });
        return;
      }
    }

    // Se o usuário confirmou, remove as colunas
    if (confirmarExclusao) {
      for (const coluna of colunasParaExcluir) {
        await poolConnection.request().query(`
          ALTER TABLE Usuarios DROP COLUMN ${coluna}
        `);
      }
      res.status(200).json({ message: 'Colunas excluídas com sucesso.' });
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao excluir colunas: ${error.message}`);
      res.status(500).json({ error: `Erro ao excluir colunas: ${error.message}` });
    } else {
      console.error('Erro desconhecido ao excluir colunas:', error);
      res.status(500).json({ error: 'Erro desconhecido ao excluir colunas.' });
    }
  }
}


