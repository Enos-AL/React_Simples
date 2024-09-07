import { connectToDatabase, pool, getColunasProtegidas } from '../config/bd'; // Verifique o caminho correto
import { Request, Response } from 'express';

// Atualize a função criarUsuario
export async function criarUsuario(req: Request, res: Response): Promise<void> {
  const dados = req.body;
  const senhaInformada = dados.senha; // Campo separado para a senha
  const colunasProtegidas = getColunasProtegidas(); // Pegando a lista de colunas protegidas do arquivo .env

  try {     
    if (!dados || Object.keys(dados).length === 0) { // Verificar se o corpo da requisição contém dados válidos
      res.status(400).json({ error: 'Dados inválidos ou não fornecidos.' });
      return;
    }

    const poolConnection = pool || await connectToDatabase();

    const columnsResult = await poolConnection.request().query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Usuarios'
    `);

    const nomesColunas = columnsResult.recordset.map((coluna: any) => coluna.COLUMN_NAME);
    const chaves = Object.keys(dados);

    // Verifique se o usuário está tentando acessar colunas que não existem
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

    // Remover o campo senha dos dados
    delete dados.senha;

    if (dados.id) {
      delete dados.id;
    }

    const idResult = await poolConnection.request().query(`
      SELECT MIN(T1.id + 1) AS menorIdFaltoso
      FROM Usuarios T1
      LEFT JOIN Usuarios T2 ON T1.id + 1 = T2.id
      WHERE T2.id IS NULL
    `);

    const novoId = idResult.recordset[0].menorIdFaltoso || 1;
    dados.id = novoId;

    const colunasQuery = Object.keys(dados).join(', ');
    const valoresQuery = Object.keys(dados).map((_, index) => `@p${index}`).join(', ');
    const request = poolConnection.request();

    Object.keys(dados).forEach((chave, index) => request.input(`p${index}`, dados[chave]));

    const query = `INSERT INTO Usuarios (${colunasQuery}) VALUES (${valoresQuery})`;
    await request.query(query);

    res.status(201).json({ message: 'Usuário criado com sucesso', id: novoId });
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Erro ao criar usuário: ${error.message}`);
      res.status(500).json({ error: `Erro ao criar usuário: ${error.message}` });
    } else {
      console.error('Erro desconhecido ao criar usuário:', error);
      res.status(500).json({ error: 'Erro desconhecido ao criar usuário.' });
    }
  }
}
