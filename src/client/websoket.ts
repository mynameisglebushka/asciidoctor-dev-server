import { WebSocketEvent } from '../shared/types/websocket-event';

export const startWebSoket = (port: string) => {
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
};

const onFileAdd = (event: WebSocketEvent) => {
	const file = event.data?.file;

	if (!file) {
		console.warn(event);
	}

	console.log(`File "${file}" is created`);
};

const onFileChange = (event: WebSocketEvent) => {
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
	window.location.reload();
};

const onFileDelete = (event: WebSocketEvent) => {
	const file = event.data?.file;

	if (!file) {
		console.warn(event);
	}

	console.log(`File "${file}" is removed`);
};
