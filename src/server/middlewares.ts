import { readFileSync } from 'node:fs';
import { HandlerFunc, Middleware } from './types/routing';
import { HtmlRenderer } from './html';

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
	RegExp,
	{
		path: string;
		contentType: string;
		modify?: (content: string) => string;
	}
>;

export const reservedStatic = (staticFiles: StaticFiles): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		return (req, res) => {
			if (req.url === undefined) {
				next(req, res);
				return;
			}

			let content: string = '';
			let contentType: string = '';

			staticFiles.forEach((val, pattern) => {
				if (content) return;

				if (pattern.test(req.url || '')) {
					const fileContent = readFileSync(val.path, {
						encoding: 'utf-8',
					});

					content = val.modify
						? val.modify(fileContent)
						: fileContent;

					contentType = val.contentType;
				}
			});

			if (content) {
				res.writeHead(200, {
					'content-type': contentType,
				}).end(content);
			} else {
				next(req, res);
			}
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
