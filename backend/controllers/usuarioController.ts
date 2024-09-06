import { Request, Response } from 'express';
import pool from '../config/bd';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Buscar todos os usuários e as colunas dinamicamente
export const getUsuarios = async (req: Request, res: Response) => {
  try {
    // Realizamos uma consulta para buscar as colunas da tabela 'Usuarios'
    const [columns]: [RowDataPacket[], any] = await pool.query('SHOW COLUMNS FROM Usuarios');
    const columnNames = columns.map((row: RowDataPacket) => row.Field); 
    // Realizamos a consulta para buscar todos os dados dos usuários
    const [data]: [RowDataPacket[], any] = await pool.query('SELECT * FROM Usuarios');
    res.json({ columns: columnNames, data });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários', error });
  }
};

// Inserir novo usuário
export const insertUsuario = async (req: Request, res: Response) => {
  try {
    const { nome, sobrenome } = req.body;
    // Executamos o comando de inserção
    const [result]: [ResultSetHeader, any] = await pool.query(
      'INSERT INTO Usuarios (nome, sobrenome) VALUES (?, ?)',
      [nome, sobrenome]
    );
    res.json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao inserir usuário', error });
  }
};

// Alterar usuário por nome e sobrenome
export const updateUsuario = async (req: Request, res: Response) => {
  try {
    const { nome, sobrenome } = req.body;
    const { id } = req.params;
    // Atualizamos o usuário com base no id fornecido
    await pool.query('UPDATE Usuarios SET nome = ?, sobrenome = ? WHERE id = ?', [nome, sobrenome, id]);
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar usuário', error });
  }
};
