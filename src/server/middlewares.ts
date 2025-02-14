import { existsSync, readFileSync } from 'node:fs';
import { HandlerFunc, Middleware } from './types/routing.js';
import { HtmlRenderer } from './html.js';
import { Logger } from './logger.js';
import { extname, join } from 'node:path';

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
	configDir: string;
}): Middleware => {
	return (next: HandlerFunc): HandlerFunc => {
		const mimeTypes: { [key: string]: string } = {
			js: 'text/javascript',
			css: 'text/css',
			adoc: 'text/plain',
			ico: 'image/vnd.microsoft.icon',
			png: 'immage/png',
		};

		const defaultMime: string = 'text/plain';

		const filesMap = opts.files;
		const scriptDir = opts.scriptDir;
		const configPath = opts.configDir;

		return (req, res) => {
			function writeContent(type: string, content: string) {
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

			// Этот if должен работать не от пути конфига, а от пути файла с контентом
			// А при заполнении конфига необходимо указать, чтобы указывали абсолютный путь
			// Потому что есть 3 источника путей файлов - каталог скрипта (/__ads), каталог конфига (абсолютный путь), и относительный путь для контента в файле
			const fileExt = extname(path);
			if (!['', '.'].includes(fileExt)) {
				if (!path.includes(configPath)) {
					path = join(configPath, path);
				}

				if (!existsSync(path)) {
					notFound(path);
					return;
				}

				const fileContent = readFileSync(path, {
					encoding: 'utf-8',
				});

				const contentType = mimeTypes[fileExt] || defaultMime;

				writeContent(contentType, fileContent);

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
