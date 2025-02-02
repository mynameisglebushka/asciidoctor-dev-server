import { Server, createServer as createHttp } from 'node:http';

import { AsciidoctorProcessor } from './asciidoctor.js';
import { HtmlRenderer } from './html.js';
import { Router } from './router.js';
import { HandlerFunc } from './types/routing.js';
import { resolve } from 'node:path';
import { chain, health, home, reservedStatic } from './middlewares.js';

export interface DevServer {
	server: Server;
	listen(cd: () => void): void;
}

interface DevServerOptions {
	settings: { port: number; sd: string };
	asciidoctor: AsciidoctorProcessor;
	html: HtmlRenderer;
	router: Router;
}

export function createServer(opts: DevServerOptions): DevServer {
	const port = opts.settings.port;
	const scriptDir = opts.settings.sd;
	const asciidoctorProcessor = opts.asciidoctor;
	const htmlRenderer = opts.html;
	const router = opts.router;

	const handler: HandlerFunc = (req, res) => {
		try {
			const url = req.url || '/';

			const path = router.getFilePath(url);
			if (!path) {
				writeReponse(htmlRenderer.notFound(url));
				return;
			}

			const convertedDocument = asciidoctorProcessor.convert(path);

			if (!convertedDocument) {
				res.writeHead(500).end('Failed');
				return;
			}

			writeReponse(htmlRenderer.render(convertedDocument));
		} catch (e) {
			console.error(e);
		}

		function writeReponse(html: string) {
			res.writeHead(200, { 'content-type': 'text/html' }).end(html);
		}
	};

	const staticFiles = new Map()
		.set(/@asciidoctor-dev-client/, {
			path: resolve(scriptDir, '../client/@asciidoctor-dev-client.js'),
			contentType: 'text/javascript',
			modify: (content: string) => {
				return content.replace('__PORT__', JSON.stringify(port));
			},
		})
		.set(/@asciidoctor-dev-render-style/, {
			path: resolve(scriptDir, '../../public/asciidoctor-dev-render.css'),
			contentType: 'text/css',
		})
		.set(/@asciidoctor-dev-self-page-style/, {
			path: resolve(
				scriptDir,
				'../../public/asciidoctor-dev-self-page.css',
			),
			contentType: 'text/css',
		})
		.set(/@render-styles/, {
			path: resolve(scriptDir, '../../public/render-styles.css'),
			contentType: 'text/css',
		})
		.set(/@asciidoctor.css/, {
			path: resolve(
				scriptDir,
				'../../node_modules/@asciidoctor/core/dist/css/asciidoctor.css',
			),
			contentType: 'text/css',
		});

	const middlewares = chain(
		health(),
		reservedStatic(staticFiles),
		home(htmlRenderer),
	);

	const _server = createHttp(middlewares(handler));

	const server: DevServer = {
		listen(cb: () => void) {
			_server.listen(port, cb);
		},
		server: _server,
	};

	return server;
}
