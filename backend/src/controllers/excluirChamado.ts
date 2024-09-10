import { connectToDatabase, pool } from '../config/bd';
import { Request, Response } from 'express';
import sql from 'mssql';

export async function excluirChamado(req: Request, res: Response): Promise<void> {
    const { id, senha } = req.body; // Extrair ID e senha do corpo da requisição

    try {
        // Verificar se a senha foi fornecida e se é a correta
        if (!senha || senha !== process.env.PERMISSAO_SENHA_PROTEGIDA) {
            res.status(403).json({
                error: 'Acesso negado. Senha necessária para excluir o chamado.'
            });
            return;
        }

        const poolConnection = pool || await connectToDatabase();

        // Verificar se o chamado com o ID fornecido existe
        const chamadoExistente = await poolConnection.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT id
                FROM Chamados
                WHERE id = @id
            `);

        if (chamadoExistente.recordset.length === 0) {
            res.status(404).json({ error: `Chamado com o ID ${id} não encontrado.` });
            return;
        }

        // Excluir o chamado
        await poolConnection.request()
            .input('id', sql.Int, id)
            .query(`
                DELETE FROM Chamados
                WHERE id = @id
            `);

        res.status(200).json({ message: `Chamado com o ID ${id} foi excluído com sucesso.` });

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao excluir o chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao excluir o chamado: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao excluir o chamado:', error);
            res.status(500).json({ error: 'Erro desconhecido ao excluir o chamado.' });
        }
    }
}
