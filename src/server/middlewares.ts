import { readFileSync } from 'node:fs';
import { HandlerFunc, Middleware } from './types/routing.js';
import { HtmlRenderer } from './html.js';
import { Logger } from './logger.js';
import { join } from 'node:path';

export const logging = (logger: Logger): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		return (req, res) => {
			const path = req.url || '/';
			logger.info(`start request on ${path}`);
			next(req, res);
			logger.info(`end request on ${path} with status ${res.statusCode}`);
		};
	};
};

export const health = (): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		return (req, res) => {
			if (req.url === '/ads-health') {
				res.writeHead(200).end();
				return;
			}

			next(req, res);
		};
	};
};

type StaticFiles = Map<
	string,
	{
		contentType: string;
		modify?: (content: string) => string;
	}
>;

export const reservedStatic = (opts: {
	files: StaticFiles;
	scriptDir: string;
}): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		return (req, res) => {
			const path = req.url!;

			const firstSep = path.indexOf('/', 1);

			if (path.slice(0, firstSep) !== '/__ads') {
				next(req, res);
				return;
			}

			const scriptDir = opts.scriptDir;
			const filesMap = opts.files;

			const relativeFilePath = path.slice(firstSep + 1);

			const fileContent = readFileSync(
				join(scriptDir, relativeFilePath),
				{
					encoding: 'utf-8',
				},
			);

			const ok = filesMap.get(relativeFilePath);

			if (!ok) {
				res.writeHead(404).end(`file ${relativeFilePath} not found`);
				return;
			}

			const { contentType, modify } = ok;

			const content = modify ? modify(fileContent) : fileContent;

			res.writeHead(200, { 'content-type': contentType }).end(content);
		};
	};
};

export const home = (html: HtmlRenderer): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		return (req, res) => {
			const url = req.url;

			if (!url) {
				res.writeHead(200, { 'content-type': 'text/html' }).end(
					html.home(),
				);
				return;
			}

			next(req, res);
		};
	};
};

export const chain = (...xs: Middleware[]): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		for (let i = xs.length - 1; i >= 0; i--) {
			const x = xs[i];
			next = x(next);
		}
		return next;
	};
};
