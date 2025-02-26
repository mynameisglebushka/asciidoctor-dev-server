import { WebSocket, WebSocketServer } from 'ws';
import { DevServer } from './server.js';
import { Logger } from './logger.js';
import {
	ConnectionEvent,
	WebSocketClientEvent,
} from '../shared/types/websocket-event.js';

export interface WSServer {
	sendEventToAllConnectedClients(event: string): void;
}

interface WSServerOptions {
	logger: Logger;
	httpServer: DevServer;
}

export function createWSServer(opts: WSServerOptions): WSServer {
	const logger = opts.logger.with('websocket');

	const _wss = new WebSocketServer({ server: opts.httpServer.server });

	_wss.on('connection', connectionHandler(logger));

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

const connectionHandler = (logger: Logger) => {
	return function (s: WebSocket) {
		s.on('error', console.error);

		s.on('message', function message(data) {
			const msg = JSON.parse(data.toString()) as WebSocketClientEvent;

			switch (msg.type) {
				case 'connect':
					logger.debug(
						`connection on path ${(<ConnectionEvent>msg).data.path}`,
					);
			}
		});
	};
};
