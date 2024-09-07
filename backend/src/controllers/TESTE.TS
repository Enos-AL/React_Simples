import { connectToDatabase, pool } from '../config/bd';
import { Request, Response } from 'express';

// Função para abrir chamados seguindo as especificações dadas
export async function criarChamados(req: Request, res: Response): Promise<void> {
    const dados = req.body;

    try {
        if (!dados || Object.keys(dados).length === 0) {
            res.status(400).json({ error: 'Dados inválidos ou não fornecidos.' });
            return;
        }

        const poolConnection = pool || await connectToDatabase();

        // Inserir automaticamente a "Data de Abertura do Chamado" e o "Status do Chamado"
        dados.DAC = new Date().toISOString(); // Data e hora da abertura
        dados.SC = 'Em Andamento'; // Status inicial do chamado

        let novoId: number;

        // Verificar o próximo ID disponível
        const idResult = await poolConnection.request().query(`
      SELECT MIN(T1.id + 1) AS menorIdFaltoso
      FROM Chamados T1
      LEFT JOIN Chamados T2 ON T1.id + 1 = T2.id
      WHERE T2.id IS NULL
    `);

        novoId = idResult.recordset[0].menorIdFaltoso || 1;
        dados.id = novoId;

        // Inserir o chamado na tabela
        const colunasQuery = Object.keys(dados).join(', ');
        const valoresQuery = Object.keys(dados).map((_, index) => `@p${index}`).join(', ');
        const requestInsert = poolConnection.request();

        Object.keys(dados).forEach((chave, index) => requestInsert.input(`p${index}`, dados[chave]));

        const queryInsert = `INSERT INTO Chamados (${colunasQuery}) VALUES (${valoresQuery})`;
        await requestInsert.query(queryInsert);

        res.status(201).json({ message: 'Chamado criado com sucesso', id: novoId });

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao criar chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao criar usuário: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao criar usuário:', error);
            res.status(500).json({ error: 'Erro desconhecido ao criar chamado.' });
        }
    }
}
