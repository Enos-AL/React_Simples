import { connectToDatabase, pool, getColunasProtegidas, getColunaAutomatica } from '../config/bd';
import { Request, Response } from 'express';
import sql from 'mssql';

// Função para concluir um chamado
export async function concluirChamado(req: Request, res: Response): Promise<void> {
    const { nome, coluna, senha, dados } = req.body; // Extrair nome do usuário, coluna, senha e dados do corpo da requisição
    const colunasProtegidas = getColunasProtegidas(); // Obter colunas protegidas do .env
    const colunasAutomaticas = getColunaAutomatica(); // Obter colunas automáticas do .env

    try {
        const poolConnection = pool || await connectToDatabase();

        // Verificar se o nome e a coluna foram fornecidos
        if (!nome || !coluna) {
            res.status(400).json({ error: 'Nome e a coluna onde está o nome devem ser fornecidos.' });
            return;
        }

        // Verificar se a descrição (DICC) foi fornecida
        if (!dados.DICC || dados.DICC.trim() === '') {
            res.status(400).json({ error: 'Descrição Informativa da Conclusão do Chamado (DICC) é obrigatória.' });
            return;
        }

        // Buscar o chamado pelo nome do usuário na coluna fornecida
        const query = `SELECT * FROM Chamados WHERE ${coluna} = @nomeUsuario`;
        const chamadoExistente = await poolConnection.request()
            .input('nomeUsuario', sql.VarChar, nome)
            .query(query)
            .then(result => result.recordset[0]);

        if (!chamadoExistente) {
            res.status(404).json({ error: 'Chamado não encontrado para o nome fornecido na coluna indicada.' });
            return;
        }

        // Validar senha para acessar as colunas protegidas
        if (!senha || senha !== process.env.PERMISSAO_SENHA_PROTEGIDA) {
            res.status(403).json({ error: 'Senha incorreta ou não fornecida.' });
            return;
        }

        // Verificar quais colunas podem ser atualizadas dinamicamente
        const atualizacoes: { [key: string]: any } = {};

        // Se a DICC não for uma coluna protegida, atualize-a
        if (!colunasProtegidas.includes('DICC')) {
            atualizacoes['DICC'] = dados.DICC;
        }

        // Atualizar colunas automáticas se permitido
        const dataAtual = new Date().toISOString();

        // Colunas automáticas configuradas no .env
        colunasAutomaticas.forEach(colunaAutomatica => {
            switch (colunaAutomatica) {
                case 'DCC':  // Data da Conclusão do Chamado
                    atualizacoes['DCC'] = dataAtual;
                    break;
                case 'SC':  // Status do Chamado
                    atualizacoes['SC'] = 'Concluído';
                    break;
                case 'TVLC':  // Tempo para concluir chamado
                    if (chamadoExistente.DAC) {
                        atualizacoes['TVLC'] = calcularTempo(chamadoExistente.DAC, dataAtual);
                    }
                    break;
                case 'SAC':  // Atualizar SAC
                    atualizacoes['SAC'] = 'Atualizado';
                    break;
                case 'DeAC':  // Data de Atualização
                    atualizacoes['DeAC'] = dataAtual;
                    break;
                default:
                    break;
            }
        });

        // Se houver atualizações, fazer o update no banco de dados
        if (Object.keys(atualizacoes).length > 0) {
            const colunasUpdate = Object.keys(atualizacoes)
                .map((coluna, index) => `${coluna} = @p${index}`)
                .join(', ');

            const requestUpdate = poolConnection.request();
            Object.keys(atualizacoes).forEach((chave, index) => {
                requestUpdate.input(`p${index}`, sql.VarChar, atualizacoes[chave]);
            });

            const queryUpdate = `UPDATE Chamados SET ${colunasUpdate} WHERE ${coluna} = @pNome`;
            await requestUpdate.input('pNome', sql.VarChar, nome).query(queryUpdate);
        }

        res.status(200).json({ message: 'Chamado concluído e atualizado com sucesso.' });

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao concluir chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao concluir chamado: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao concluir chamado:', error);
            res.status(500).json({ error: 'Erro desconhecido ao concluir chamado.' });
        }
    }
}

/**
 * Função para calcular o tempo decorrido entre duas datas em dias e horas
 * @param dataInicio Data de início
 * @param dataFim Data de fim
 * @returns Tempo decorrido formatado como dias e horas
 */
function calcularTempo(dataInicio: string, dataFim: string): string {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diffMs = fim.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${diffDays} dias e ${diffHrs} horas`;
}
