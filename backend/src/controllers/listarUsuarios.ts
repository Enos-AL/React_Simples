// src/controllers/usuarioController.ts
import { connectToDatabase, pool} from '../config/bd'; // Verifique o caminho correto
import { Request, Response } from 'express';


// Função para listar usuários// Função para listar usuários com filtragem dinâmica por múltiplas colunas
export async function listarUsuarios(req: Request, res: Response) {
    try {
      const poolConnection = pool || await connectToDatabase(); // Conecta ou usa a conexão existente
  
      // Extrai os parâmetros de query da requisição
      const queryParams = req.query;
  
      // Query base
      let query = 'SELECT * FROM Usuarios';
      const conditions: string[] = [];
      const request = poolConnection.request();
  
      // Para cada chave nos parâmetros de query (colunas/valores de filtragem)
      Object.keys(queryParams).forEach((coluna, index) => {
        const valor = queryParams[coluna];
  
        // Adiciona uma condição de filtragem para cada coluna
        if (valor) {
          conditions.push(`${coluna} = @valor${index}`);
          request.input(`valor${index}`, valor); // Define parâmetros de forma dinâmica
        }
      });
  
      // Se houver condições, adiciona à query
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
  
      const result = await request.query(query);
  
      res.status(200).json(result.recordset);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Erro ao listar usuários: ${error.message}`);
        res.status(500).send(`Erro ao listar usuários: ${error.message}`);
      } else {
        console.error('Erro desconhecido ao listar usuários:', error);
        res.status(500).send('Erro desconhecido ao listar usuários.');
      }
    }
  }