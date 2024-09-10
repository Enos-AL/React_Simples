import { connectToDatabase, pool, getColunasProtegidas, getColunaAutomatica } from '../config/bd';
import { Request, Response } from 'express';
import sql from 'mssql';

// Função para verificar e atualizar chamados
export async function verificarChamado(req: Request, res: Response): Promise<void> {
    const { id, senha, nome, dados } = req.body;
    const colunasProtegidas = getColunasProtegidas();
    const colunasAutomaticas = getColunaAutomatica(); // Chamada sem argumento

    try {
        const poolConnection = pool || await connectToDatabase();

        let chamadoExistente;

        if (id) {
            chamadoExistente = await poolConnection.request()
                .input('idChamado', id)
                .query('SELECT * FROM Chamados WHERE id = @idChamado')
                .then(result => result.recordset[0]);

            if (!chamadoExistente) {
                res.status(404).json({ error: 'Chamado não encontrado.' });
                return;
            }
        } else if (nome) {
            chamadoExistente = await poolConnection.request()
                .input('nomeUsuario', nome)
                .query('SELECT * FROM Chamados WHERE NU = @nomeUsuario')
                .then(result => result.recordset[0]);

            if (!chamadoExistente) {
                res.status(404).json({ error: 'Chamado não encontrado para o nome de usuário fornecido.' });
                return;
            }
        } else {
            res.status(400).json({ error: 'ID ou nome de usuário deve ser fornecido.' });
            return;
        }

        if (!senha || senha !== process.env.PERMISSAO_SENHA_PROTEGIDA) {
            res.status(403).json({ error: 'Senha incorreta ou não fornecida.' });
            return;
        }

        if (chamadoExistente.NU === null && (!dados.NU || dados.NU === '')) {
            res.status(400).json({ error: 'NU deve ser fornecido dentro dos dados quando NU estiver NULL.' });
            return;
        }

        const colunas = Object.keys(dados);
        const columnsResult = await poolConnection.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Chamados'
        `);
        const nomesColunas = columnsResult.recordset.map((coluna: any) => coluna.COLUMN_NAME);

        const colunasInexistentes = colunas.filter(coluna => !nomesColunas.includes(coluna));
        if (colunasInexistentes.length > 0) {
            res.status(400).json({ error: `As seguintes colunas não existem: ${colunasInexistentes.join(', ')}` });
            return;
        }

        const colunasProtegidasModificadas = colunasProtegidas.filter(coluna => colunas.includes(coluna));
        if (colunasProtegidasModificadas.length > 0) {
            res.status(403).json({ error: `Não é permitido alterar as colunas protegidas: ${colunasProtegidasModificadas.join(', ')}` });
            return;
        }

        const dataAtual = new Date().toISOString();
        dados.DVC = dataAtual; // Data da verificação
        dados.SC = 'Verificado'; // Status do chamado

        const dataAbertura = chamadoExistente.DAC;
        if (dataAbertura) {
            const tempoVerificacao = calcularTempo(dataAbertura, dataAtual);
            dados.TVC = tempoVerificacao; // Tempo de verificação

            const tempoConclusao = calcularTempo(dataAbertura, dataAtual);
            dados.TVLC = tempoConclusao; // Tempo para concluir o chamado
        }

        dados.SAC = 'Atualizado';
        dados.DeAC = dataAtual; // Data de atualização

        const atualizacoes: { [key: string]: any } = {};

        colunasAutomaticas.forEach(colunaAutomatica => {
            switch (colunaAutomatica) {
                case 'DVC':
                    atualizacoes['DVC'] = dataAtual;
                    break;
                case 'SC':
                    atualizacoes['SC'] = 'Verificado';
                    break;
                case 'TVC':
                    atualizacoes['TVC'] = dados.TVC;
                    break;
                case 'TVLC':
                    atualizacoes['TVLC'] = dados.TVLC;
                    break;
                case 'SAC':
                    atualizacoes['SAC'] = 'Atualizado';
                    break;
                case 'DeAC':
                    atualizacoes['DeAC'] = dataAtual;
                    break;
                default:
                    break;
            }
        });

        if (Object.keys(atualizacoes).length > 0) {
            const colunasUpdate = Object.keys(atualizacoes)
                .map((coluna, index) => `${coluna} = @p${index}`)
                .join(', ');

            const requestUpdate = poolConnection.request();
            Object.keys(atualizacoes).forEach((chave, index) => {
                requestUpdate.input(`p${index}`, sql.VarChar, atualizacoes[chave]);
            });

            const queryUpdate = `UPDATE Chamados SET ${colunasUpdate} WHERE id = @pId`;
            await requestUpdate.input('pId', chamadoExistente.id).query(queryUpdate);
        }

        res.status(200).json({ message: 'Chamado verificado e atualizado com sucesso' });

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao verificar chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao verificar chamado: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao verificar chamado:', error);
            res.status(500).json({ error: 'Erro desconhecido ao verificar chamado.' });
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
