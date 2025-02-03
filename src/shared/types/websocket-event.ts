export type WebSocketEventType = 'file_change' | 'file_remove' | 'file_added';

export interface WebSocketEvent {
	type: WebSocketEventType;
}

export interface FileAddEvent extends WebSocketEvent {
	type: 'file_added';
	data: {
		route: string;
		file: string;
		title?: string;
	};
}

export interface FileChangeEvent extends WebSocketEvent {
	type: 'file_change';
	data: {
		route: string;
	};
}

export interface FileRemovedEvent extends WebSocketEvent {
	type: 'file_remove';
	data: {
		file: string;
	};
}

export const socketEvent = <T extends WebSocketEvent>(event: T): string => {
	return JSON.stringify(event);
};
