declare const __PORT__: string;

import { WebSocketEvent } from '../shared/types/websocket-event';

const port = __PORT__;

const ws = new WebSocket(`ws://localhost:${port}`);

ws.onopen = () => {
	console.log('Connected to server');
	ws.send('Hello, Server!');
};

ws.onmessage = (event) => {
	const data = JSON.parse(event.data) as WebSocketEvent;

	if (data.type === 'reload') {
		window.location.reload();

		ws.send('Success page reload');

		return;
	}

	console.log(`Message from server: ${data.type}`);
};

ws.onclose = () => {
	console.log('Connection closed');
};
