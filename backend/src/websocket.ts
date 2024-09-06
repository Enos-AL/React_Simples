import { io } from './http';

// Função para configurar tudo que é relacionado a WebSocket
export function setupWebSocket() {

    // Configuração do WebSocket
    io.on('connection', (socket) => {
        console.log('Um usuário se conectou', socket.id);

        // Exemplo de evento emitido do cliente para o servidor
        socket.on('clientMessage', (message) => {
            console.log('Mensagem do cliente:', message);

            // Exemplo de evento emitido do servidor para todos os clientes
            io.emit('serverMessage', `Mensagem recebida: ${message}`);
        });

        socket.on('disconnect', () => {
            console.log('Usuário desconectado', socket.id);
        });
    });

    return io;
}
