import { WebSocket, WebSocketServer } from 'ws';
import { DevServer } from './server.js';
import {
	socketEvent,
	WebSocketEvent,
} from '../shared/types/websocket-event.js';

export class WSServer {
	private wss: WebSocketServer;

	constructor(server: DevServer) {
		this.wss = new WebSocketServer({ server: server.server });

		this.wss.on('connection', this.connectionHandler);
	}

	private connectionHandler = (s: WebSocket) => {
		s.on('error', console.error);

		s.on('message', function message(data) {
			console.log('received: %s', data);
		});
	};

	sendEventToAllConnectedClients(event: WebSocketEvent): void {
		this.wss.clients.forEach((client) => {
			if (client.readyState !== WebSocket.OPEN) return;

			client.send(socketEvent(event));
		});
	}
}
