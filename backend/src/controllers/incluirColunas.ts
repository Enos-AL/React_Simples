import { connectToDatabase, pool } from '../config/bd'; // Verifique o caminho correto
import { Request, Response } from 'express';

// Inserir dados dinamicamente com base nas colunas disponíveis
export async function incluirColunas(req: Request, res: Response): Promise<void> {
    const { novasColunas } = req.body;

    // Verifica se "novasColunas" é uma string, e transforma em um array caso seja necessário
    const novasColunasArray = Array.isArray(novasColunas) ? novasColunas : [novasColunas];

    try {
        const poolConnection = pool || await connectToDatabase(); // Conecta ou usa a conexão existente

        // Obtém os nomes das colunas existentes na tabela
        const result = await poolConnection.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Chamados'
        `);

        // Mapeia as colunas existentes para minúsculas, mantendo o nome original para comparações posteriores
        const nomesColunasExistentes = result.recordset.map((coluna: any) => ({
            original: coluna.COLUMN_NAME,
            lower: coluna.COLUMN_NAME.toLowerCase()
        }));

        for (const novaColuna of novasColunasArray) {
            const nomeColunaLower = novaColuna.toLowerCase();

            // Verifica se o nome da coluna já existe (independente de maiúsculas ou minúsculas)
            const colunaExistente = nomesColunasExistentes.find(coluna => coluna.lower === nomeColunaLower);

            if (colunaExistente) {
                // Se encontrar uma coluna com o mesmo nome, independente de maiúsculas/minúsculas
                if (colunaExistente.original === novaColuna) {
                    res.status(400).json({ error: `A coluna "${novaColuna}" já existe com o mesmo nome.` });
                } else {
                    res.status(400).json({
                        error: `A coluna "${novaColuna}" já existe com uma diferença de maiúsculas/minúsculas. Coluna existente: "${colunaExistente.original}".`
                    });
                }
                return;
            }
        }

        // Se passar pelas verificações, adicionar as colunas ao banco de dados
        for (const novaColuna of novasColunasArray) {
            await poolConnection.request().query(`
                ALTER TABLE Chamados ADD ${novaColuna} VARCHAR(255)
            `);
        }

        res.status(201).json({ message: 'Colunas incluídas com sucesso.' });
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao incluir colunas: ${error.message}`);
            res.status(500).json({ error: `Erro ao incluir colunas: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao incluir colunas:', error);
            res.status(500).json({ error: 'Erro desconhecido ao incluir colunas.' });
        }
    }
}
