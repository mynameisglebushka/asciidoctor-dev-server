// Servers

export type WebSocketServerEventType =
	| 'file_change'
	| 'file_remove'
	| 'file_added';

export interface WebSocketServerEvent {
	type: WebSocketServerEventType;
}

export interface FileAddEvent extends WebSocketServerEvent {
	type: 'file_added';
	data: {
		route: string;
		file: string;
		title?: string;
	};
}

export interface FileChangeEvent extends WebSocketServerEvent {
	type: 'file_change';
	data: {
		route?: string;
		affected_routes?: string[];
	};
}

export interface FileRemovedEvent extends WebSocketServerEvent {
	type: 'file_remove';
	data: {
		file: string;
	};
}

export const socketServerEvent = <T extends WebSocketServerEvent>(
	event: T,
): string => {
	return JSON.stringify(event);
};

// Clients

export type WebSocketClientEventType = 'connect';

export interface WebSocketClientEvent {
	type: WebSocketClientEventType;
}

export interface ConnectionEvent extends WebSocketClientEvent {
	type: 'connect';
	data: {
		path: string;
	};
}

export const socketClientEvent = <T extends WebSocketClientEvent>(
	event: T,
): string => {
	return JSON.stringify(event);
};
