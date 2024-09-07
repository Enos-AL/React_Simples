import express from "express";      // Importa o módulo 'express' para criar uma aplicação web
import http from "http";            // Importa o módulo 'http' para criar um servidor HTTP
import { Server } from "socket.io"; // Importa o módulo 'socket.io' para adicionar funcionalidade de WebSocket
import cors from "cors";            // Importa o módulo 'cors' para lidar com questões de CORS

// Cria uma instância da aplicação Express
const app = express();

// Configuração para interpretar JSON no corpo das requisições
app.use(express.json()); // <-- Esta linha é necessária para que o Express entenda o JSON

// Configuração do CORS para o servidor HTTP (Express)
app.use(cors({
    origin: 'http://localhost:3001', // URL do frontend que será permitido
    methods: ['GET', 'POST'],        // Métodos HTTP permitidos
    credentials: true,               // Permitir envio de cookies nas requisições
}));

// Cria um servidor HTTP usando a aplicação Express
const serverHttp = http.createServer(app);

// Cria uma instância do servidor Socket.io associada ao servidor HTTP
const io = new Server(serverHttp, {
    cors: {
        origin: 'http://localhost:3001', // Permitir conexões WebSocket apenas dessa origem
        methods: ['GET', 'POST'],        // Métodos permitidos para o WebSocket
        credentials: true,               // Permitir envio de cookies via WebSocket
    }
});

// Exporta as instâncias da aplicação Express, servidor HTTP e Socket.io para uso em outros módulos
export { app, serverHttp, io };
