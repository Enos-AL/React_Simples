import { connectToDatabase, pool, getColunasProtegidas } from '../config/bd';
import { Request, Response } from 'express';
import sql from 'mssql';

// Função para abrir chamados seguindo as especificações dadas
export async function criarChamados(req: Request, res: Response): Promise<void> {
    const { NU, senha, dados } = req.body; // Extrair NU, senha e dados do corpo da requisição
    const colunasProtegidas = getColunasProtegidas(); // Obter colunas protegidas do .env

    try {
        if (!dados || Object.keys(dados).length === 0) {
            res.status(400).json({ error: 'Dados inválidos ou não fornecidos.' });
            return;
        }

        const poolConnection = pool || await connectToDatabase();

        // Verificar se o usuário já existe pelo nome de usuário (NU)
        const usuarioExistente = await poolConnection.request()
            .input('NU', sql.VarChar, NU)
            .query(`
                SELECT id
                FROM Chamados
                WHERE NU = @NU
            `);

        if (usuarioExistente.recordset.length > 0) {
            // Se o usuário já existe, retornar erro
            res.status(400).json({
                error: `O usuário com o nome '${NU}' já está cadastrado.`
            });
            return;
        }

        // Verificar se o usuário está tentando modificar colunas protegidas
        const colunasModificadas = Object.keys(dados);
        const colunasRestritasModificadas = colunasProtegidas.filter(coluna => colunasModificadas.includes(coluna));

        if (colunasRestritasModificadas.length > 0) {
            if (!senha || senha !== process.env.PERMISSAO_SENHA_PROTEGIDA) {
                // Registrar tentativa de acesso a colunas protegidas sem a senha correta
                await registrarTentativaAcesso(poolConnection, NU, colunasRestritasModificadas.join(', '), false);
                
                res.status(403).json({
                    error: `Acesso negado. Senha necessária para alterar as colunas protegidas: ${colunasRestritasModificadas.join(', ')}`
                });
                return;
            }
        }

        // Adicionar automaticamente a "Data de Abertura do Chamado" e o "Status do Chamado"
        dados.DAC = new Date().toISOString(); // Data e hora da abertura
        dados.SC = 'Em Andamento'; // Status inicial do chamado

        // Obter as colunas da tabela 'Chamados' para validar as entradas
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
            await registrarTentativaAcesso(poolConnection, NU, colunasInexistentes.join(', '), false);

            // Retornar erro ao cliente informando quais colunas não existem
            res.status(400).json({
                error: `As seguintes colunas não existem na tabela: ${colunasInexistentes.join(', ')}`
            });
            return;
        }

        // Se o ID não for passado no JSON, criar um novo ID
        const novoId = await obterNovoId(poolConnection);
        dados.id = novoId; // Atribuir o novo ID aos dados

        // Remover a senha dos dados antes de inserir no banco
        delete dados.senha;

        // Inserir o novo chamado
        const colunasQuery = Object.keys(dados).join(', ');
        const valoresQuery = Object.keys(dados).map((_, index) => `@p${index}`).join(', ');
        const requestInsert = poolConnection.request();

        // Adicionar parâmetros ao requestInsert
        Object.entries(dados).forEach(([chave, valor], index) => {
            requestInsert.input(`p${index}`, valor);
        });

        const queryInsert = `INSERT INTO Chamados (${colunasQuery}) VALUES (${valoresQuery})`;
        await requestInsert.query(queryInsert);

        res.status(201).json({ message: 'Chamado criado com sucesso', id: novoId });

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao criar chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao criar chamado: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao criar chamado:', error);
            res.status(500).json({ error: 'Erro desconhecido ao criar chamado.' });
        }
    }
}

// Função auxiliar para registrar tentativas de acesso
async function registrarTentativaAcesso(poolConnection: sql.ConnectionPool, nomeUsuario: string | undefined, colunaTentada: string, sucesso: boolean) {
    await poolConnection.request()
        .input('nomeUsuario', nomeUsuario || 'Usuário desconhecido')
        .input('colunaTentada', colunaTentada)
        .input('sucesso', sucesso ? 1 : 0)
        .query(`
            INSERT INTO TentativasAcesso (nomeUsuario, colunaTentada, sucesso)
            VALUES (@nomeUsuario, @colunaTentada, @sucesso)
        `);
}

// Função auxiliar para obter o próximo ID disponível
async function obterNovoId(poolConnection: sql.ConnectionPool): Promise<number> {
    const idResult = await poolConnection.request().query(`
        SELECT MIN(T1.id + 1) AS menorIdFaltoso
        FROM Chamados T1
        LEFT JOIN Chamados T2 ON T1.id + 1 = T2.id
        WHERE T2.id IS NULL
    `);

    return idResult.recordset[0].menorIdFaltoso || 1; // Gera o próximo ID disponível
}
