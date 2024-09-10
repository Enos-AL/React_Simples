import { connectToDatabase, pool } from '../config/bd';
import { Request, Response } from 'express';

// Função para concluir o chamado
export async function concluirChamado(req: Request, res: Response): Promise<void> {
    const { id, DICC } = req.body;
  
    if (!id || !DICC) {
      res.status(400).json({ error: 'ID e descrição informativa de conclusão (DICC) são obrigatórios.' });
      return;
    }
  
    try {
      const poolConnection = pool || await connectToDatabase();
  
      // Buscar o DAC e DVC para calcular os tempos de verificação e conclusão
      const result = await poolConnection.request()
        .input('id', id)
        .query(`SELECT DAC, DVC FROM Chamados WHERE id = @id`);
  
      if (result.recordset.length === 0) {
        res.status(404).json({ error: 'Chamado não encontrado.' });
        return;
      }
  
      const { DAC, DVC } = result.recordset[0];
      const DCC = new Date().toISOString();
  
      // Calcular TVC (Tempo de Verificação do Chamado) e TVLC (Tempo de Conclusão)
      const tempoVerificacao = Math.abs(new Date(DVC).getTime() - new Date(DAC).getTime());
      const tempoConclusao = Math.abs(new Date(DCC).getTime() - new Date(DAC).getTime());
  
      const TVC = formatarTempo(tempoVerificacao);
      const TVLC = formatarTempo(tempoConclusao);
  
      const query = `
        UPDATE Chamados
        SET DICC = @DICC, SC = 'Concluído', DCC = @DCC, TVC = @TVC, TVLC = @TVLC
        WHERE id = @id
      `;
  
      await poolConnection.request()
        .input('DICC', DICC)
        .input('DCC', DCC)
        .input('TVC', TVC)
        .input('TVLC', TVLC)
        .input('id', id)
        .query(query);
  
      res.status(200).json({ message: 'Chamado concluído com sucesso', id });
    } catch (error) {
        if (error instanceof Error) {
            console.error(`Erro ao concluir chamado: ${error.message}`);
            res.status(500).json({ error: `Erro ao criar chamado: ${error.message}` });
        } else {
            console.error('Erro desconhecido ao concluir chamado:', error);
            res.status(500).json({ error: 'Erro desconhecido ao concluir chamado.' });
        }
    }
  }
  
  // Função para formatar o tempo (em milissegundos) em dias e horas
  function formatarTempo(ms: number): string {
    const dias = Math.floor(ms / (1000 * 60 * 60 * 24));
    const horas = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${dias} dias e ${horas} horas`;
  }
  