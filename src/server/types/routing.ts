import { IncomingMessage, ServerResponse } from 'node:http';

export type HandlerFunc = (req: IncomingMessage, res: ServerResponse) => void;

export type Middleware = (next: HandlerFunc) => HandlerFunc;
