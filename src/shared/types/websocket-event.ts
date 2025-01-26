export type WebSocketEventType = 'file_change' | 'file_remove' | 'file_added';

export interface WebSocketEvent {
	type: WebSocketEventType;
	data?: {
		file?: string;
		message?: string;
	};
}

export const socketEvent = (event: WebSocketEvent): string => {
	return JSON.stringify(event);
};
