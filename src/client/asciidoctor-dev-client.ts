declare const __PORT__: string;

import { WebSocketEvent } from '../shared/types/websocket-event';

const port = __PORT__;

const ws = new WebSocket(`ws://localhost:${port}`);

ws.onopen = () => {
	ws.send(`Client, connected on ${window.location.toString()}!`);
};

ws.onmessage = (event) => {
	const messageData = JSON.parse(event.data) as WebSocketEvent;

	switch (messageData.type) {
		case 'file_added': {
			onFileAdd(messageData);
			break;
		}
		case 'file_change': {
			onFileChange(messageData);
			break;
		}
		case 'file_remove': {
			onFileDelete(messageData);
			break;
		}
	}

	console.log(`Message from server: ${messageData.type}`);
};

ws.onclose = () => {
	console.log('Connection closed');
};

function onFileAdd(event: WebSocketEvent) {
	const file = event.data?.file;

	if (!file) {
		console.warn(event);
	}

	console.log(`File "${file}" is created`);
}

function onFileChange(event: WebSocketEvent) {
	const file = event.data?.file;

	if (!file) {
		console.log(`File not exist in message ${event.toString()}`);
		return;
	}

	const i = file.lastIndexOf('.');

	if (!i) {
		console.warn('Cannot find file extension');
		return;
	}

	const path = file.slice(0, i);

	if (!path) {
		console.warn(file);
	}

	if (window.location.pathname.slice(1) !== path) {
		console.debug(
			`current page "${window.location.pathname}" not affected by "${path}" file change`,
		);
		return;
	}

	console.log('Page content was changed');
}

function onFileDelete(event: WebSocketEvent) {
	const file = event.data?.file;

	if (!file) {
		console.warn(event);
	}

	console.log(`File "${file}" is removed`);
}
