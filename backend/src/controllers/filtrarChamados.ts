import { connectToDatabase, pool } from '../config/bd';
import { Request, Response } from 'express'; 

export async function filtrarChamados(req: Request, res: Response): Promise<void> {
  const { coluna, valor } = req.body;

  // Verifica se os parâmetros obrigatórios foram passados
  if (!coluna || !valor) {
    res.status(400).json({ error: 'Coluna e valor são obrigatórios.' });
    return;
  }

  try {

    const poolConnection = pool || await connectToDatabase();

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
      console.error(`Erro ao filtrar chamados: ${error.message}`);
      res.status(500).json({ error: `Erro ao filtrar chamados: ${error.message}` });
    } else {
      console.error('Erro desconhecido ao filtrar chamados:', error);
      res.status(500).json({ error: 'Erro desconhecido ao filtrar chamados.' });
    }
  }
}
