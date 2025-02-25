import { existsSync, readFileSync } from 'node:fs';
import { HandlerFunc, Middleware } from './types/routing.js';
import { HtmlRenderer } from './html.js';
import { Logger } from './logger.js';
import { extname, join } from 'node:path';
import mime from 'mime-types';

const CAN_LOG_REQUEST = (path: string) => {
	return ['.adoc', ''].includes(extname(path));
};

export const logging = (logger: Logger): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		return (req, res) => {
			const path = req.url || '/';

			if (CAN_LOG_REQUEST(path)) logger.info(`request: path - ${path}`);

			next(req, res);

			if (CAN_LOG_REQUEST(path))
				logger.info(
					`response: path - ${path}, status - ${res.statusCode}`,
				);
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
	configDir: string;
	contentDir: string;
}): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		const defaultMime: string = 'application/octet-stream';

		const filesMap = opts.files;
		const scriptDir = opts.scriptDir;
		const configPath = opts.configDir;
		const contentPath = opts.contentDir;

		return (req, res) => {
			function writeContent(type: string, content: unknown) {
				res.writeHead(200, { 'content-type': type }).end(content);
			}

			function notFound(path: string) {
				res.writeHead(404).end(`file ${path} not found`);
			}

			let path = req.url!;

			if (path.startsWith('/__ads')) {
				const relativeFilePath = path.slice(path.indexOf('/', 1) + 1);

				const ok = filesMap.get(relativeFilePath);

				if (!ok) {
					notFound(relativeFilePath);
					return;
				}

				const fileContent = readFileSync(
					join(scriptDir, relativeFilePath),
					{
						encoding: 'utf-8',
					},
				);

				const { contentType, modify } = ok;

				const content = modify ? modify(fileContent) : fileContent;

				writeContent(contentType, content);
				return;
			}

			const fileExt = extname(path);

			// TODO: Доработать хэндлер на прием .adoc запросов
			if (fileExt === '.adoc') {
				next(req, res);
				return;
			}

			if (!['', '.'].includes(fileExt)) {
				if (configPath !== '' && !path.includes(configPath)) {
					path = join(contentPath, path);
				}

				if (!existsSync(path)) {
					notFound(path);
					return;
				}

				writeContent(
					mime.contentType(fileExt) || defaultMime,
					readFileSync(path),
				);

				return;
			}

			next(req, res);
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
