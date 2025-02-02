import { WebSocket, WebSocketServer } from 'ws';
import { DevServer } from './server.js';

export interface WSServer {
	sendEventToAllConnectedClients(event: string): void;
}

interface WSServerOptions {
	httpServer: DevServer;
}

export function createWSServer(opts: WSServerOptions): WSServer {
	const _wss = new WebSocketServer({ server: opts.httpServer.server });

	_wss.on('connection', connectionHandler);

	const wss: WSServer = {
		sendEventToAllConnectedClients(event) {
			_wss.clients.forEach((client) => {
				if (client.readyState !== WebSocket.OPEN) return;

				client.send(event);
			});
		},
	};

	return wss;
}

const connectionHandler = (s: WebSocket) => {
	s.on('error', console.error);

	s.on('message', function message(data) {
		console.log('received: %s', data);
	});
};
