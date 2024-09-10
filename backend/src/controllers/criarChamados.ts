import { connectToDatabase, pool, getColunasProtegidas } from '../config/bd';
import { Request, Response } from 'express';

// Função para abrir chamados seguindo as especificações dadas
export async function criarChamados(req: Request, res: Response): Promise<void> {
    const dados = req.body;
    const senhaInformada = dados.senha; // Campo separado para a senha
    const colunasProtegidas = getColunasProtegidas();// Obter as colunas protegidas a partir da função configurada

    try {
        if (!dados || Object.keys(dados).length === 0) {
            res.status(400).json({ error: 'Dados inválidos ou não fornecidos.' });
            return;
        }

        const poolConnection = pool || await connectToDatabase();

        // Obter a senha protegida do ambiente (já configurada no pool)
        const senhaProtegida = process.env.PERMISSAO_SENHA_PROTEGIDA;

        // Verificar se o usuário está tentando modificar alguma coluna protegida
        const colunasModificadas = Object.keys(dados);
        const colunasRestritasModificadas = colunasProtegidas.filter(coluna => colunasModificadas.includes(coluna));

        if (colunasRestritasModificadas.length > 0) {
            // Verificar se a senha foi fornecida e é válida
            if (!dados.senha || dados.senha !== senhaProtegida) {
                res.status(403).json({
                    error: `Acesso negado. Senha necessária para alterar as colunas protegidas: ${colunasRestritasModificadas.join(', ')}`
                });
                return;
            }
        }

        // Adicionar automaticamente a "Data de Abertura do Chamado" e o "Status do Chamado"
        dados.DAC = new Date().toISOString(); // Data e hora da abertura
        dados.SC = 'Em Andamento'; // Status inicial do chamado

        // Obter dinamicamente as colunas da tabela 'Chamados'
        const columnsResult = await poolConnection.request().query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'Chamados'
        `);

        const nomesColunas = columnsResult.recordset.map((coluna: any) => coluna.COLUMN_NAME);
        const chaves = Object.keys(dados);

        // Verificar se o usuário está tentando acessar colunas que não existem
        const colunasInexistentes = chaves.filter(coluna => !nomesColunas.includes(coluna) && coluna !== 'senha');

        if (colunasInexistentes.length > 0) {
            // Registrar tentativa de inserção em colunas inexistentes
            const logRequest = poolConnection.request();
            await logRequest
                .input('nomeUsuario', dados.nome || 'Usuário desconhecido')
                .input('colunaTentada', colunasInexistentes.join(', '))
                .input('sucesso', 0) // Falha no acesso
                .query(`
                    INSERT INTO TentativasAcesso (nomeUsuario, colunaTentada, sucesso)
                    VALUES (@nomeUsuario, @colunaTentada, @sucesso)
                `);
            // Retornar erro ao cliente informando quais colunas não existem
            res.status(400).json({
                error: `As seguintes colunas não existem na tabela: ${colunasInexistentes.join(', ')}`
            });
            return;
        }

        // Verificar permissão para colunas protegidas
        const usuarioTentouAcessarColunaProtegida = colunasProtegidas.some((coluna: string) => chaves.includes(coluna));
        if (usuarioTentouAcessarColunaProtegida) {
            if (!senhaInformada || senhaInformada !== process.env.PERMISSAO_SENHA_PROTEGIDA) {
                // Registrar tentativa de acesso no banco de dados
                const logRequest = poolConnection.request();
                await logRequest
                    .input('nomeUsuario', dados.nome || 'Usuário desconhecido')
                    .input('colunaTentada', colunasProtegidas.find((coluna: string) => chaves.includes(coluna)) || 'Coluna desconhecida')
                    .input('sucesso', 0)
                    .query(`
            INSERT INTO TentativasAcesso (nomeUsuario, colunaTentada, sucesso)
            VALUES (@nomeUsuario, @colunaTentada, @sucesso)
          `);

                res.status(403).json({ error: 'Permissão negada. Senha incorreta ou não fornecida.' });
                return;
            } else {
                // Registrar sucesso
                const logRequest = poolConnection.request();
                await logRequest
                    .input('nomeUsuario', dados.nome || 'Usuário desconhecido')
                    .input('colunaTentada', colunasProtegidas.find((coluna: string) => chaves.includes(coluna)) || 'Coluna desconhecida')
                    .input('sucesso', 1)
                    .query(`
            INSERT INTO TentativasAcesso (nomeUsuario, colunaTentada, sucesso)
            VALUES (@nomeUsuario, @colunaTentada, @sucesso)
          `);
            }
        }

        // Remover a senha dos dados antes de inserir no banco
        delete dados.senha;

        if (dados.id) {
            delete dados.id;
        }

        let novoId: number;

        // Obter dinamicamente as colunas que possuem valores NULL em algum ID existente
        const nullColumnsResult = await poolConnection.request().query(`
            SELECT id
            FROM Chamados
            WHERE ${nomesColunas.filter(coluna => coluna !== 'id').map(coluna => `${coluna} IS NULL`).join(' AND ')}
        `);

        if (nullColumnsResult.recordset.length > 0) {
            novoId = nullColumnsResult.recordset[0].id;
        } else {
            // Buscar o próximo ID disponível
            const idResult = await poolConnection.request().query(`
                SELECT MIN(T1.id + 1) AS menorIdFaltoso
                FROM Chamados T1
                LEFT JOIN Chamados T2 ON T1.id + 1 = T2.id
                WHERE T2.id IS NULL
            `);

            novoId = idResult.recordset[0].menorIdFaltoso || 1;
        }

        dados.id = novoId;

        // Se o ID foi reutilizado, atualize o registro existente
        if (nullColumnsResult.recordset.length > 0) {
            const colunasUpdate = Object.keys(dados).map((coluna, index) => `${coluna} = @p${index}`).join(', ');
            const requestUpdate = poolConnection.request();

            Object.keys(dados).forEach((chave, index) => requestUpdate.input(`p${index}`, dados[chave]));

            const queryUpdate = `UPDATE Chamados SET ${colunasUpdate} WHERE id = @pId`;
            await requestUpdate.input('pId', novoId).query(queryUpdate);
        } else {
            // Se não há um ID reutilizado, insira um novo registro
            const colunasQuery = Object.keys(dados).join(', ');
            const valoresQuery = Object.keys(dados).map((_, index) => `@p${index}`).join(', ');
            const requestInsert = poolConnection.request();

            Object.keys(dados).forEach((chave, index) => requestInsert.input(`p${index}`, dados[chave]));

            const queryInsert = `INSERT INTO Chamados (${colunasQuery}) VALUES (${valoresQuery})`;
            await requestInsert.query(queryInsert);
        }

        res.status(201).json({ message: 'Chamado criado com sucesso', id: novoId });

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao criar chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao criar chamado: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao criar chamado:', error);
            res.status(500).json({ error: 'Erro desconhecido ao verificar chamado.' });
        }
    }
}
