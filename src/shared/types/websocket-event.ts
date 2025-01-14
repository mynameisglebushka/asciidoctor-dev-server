export type WebSocketEventType = 'reload' | 'custom';

export interface WebSocketEvent {
	type: WebSocketEventType;
	data?: {
		message: string;
	};
}

export const socketEvent = (event: WebSocketEvent): string => {
	return JSON.stringify(event);
};
