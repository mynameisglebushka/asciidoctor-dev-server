import { Server, createServer as createHttp } from 'node:http';

import { AsciidoctorProcessor } from './asciidoctor.js';
import { HtmlRenderer } from './html.js';
import { Router } from './router.js';
import { HandlerFunc } from './types/routing.js';
import {
	reservedStatic,
	chain,
	health,
	home,
	logging,
} from './middlewares.js';
import { Logger } from './logger.js';

export interface DevServer {
	server: Server;
	listen(cd: () => void): void;
}

interface DevServerOptions {
	logger: Logger;
	settings: { port: number; sd: string };
	asciidoctor: AsciidoctorProcessor;
	html: HtmlRenderer;
	router: Router;
}

export function createServer(opts: DevServerOptions): DevServer {
	const log = opts.logger.with('server');

	const port = opts.settings.port;
	const scriptDir = opts.settings.sd;
	const asciidoctorProcessor = opts.asciidoctor;
	const htmlRenderer = opts.html;
	const router = opts.router;

	const handler: HandlerFunc = (req, res) => {
		try {
			const url = req.url || '/';

			const path = router.getAbsPathByRoute(url);
			if (!path) {
				writeReponse(htmlRenderer.notFound(url));
				return;
			}

			const convertedDocument = asciidoctorProcessor.convert(path);

			if (!convertedDocument) {
				log.error(`fail on convert document ${path}`);
				res.writeHead(500).end(`Cannot convert document ${path}`);
				return;
			}

			writeReponse(htmlRenderer.render(convertedDocument));
		} catch (e) {
			const error = e as Error;
			log.error(error.message);

			res.writeHead(500).end();
		}

		function writeReponse(html: string) {
			res.writeHead(200, { 'content-type': 'text/html' }).end(html);
		}
	};

	const _staticFiles = new Map()
		.set('dist/client/@asciidoctor-dev-client.js', {
			contentType: 'text/javascript',
			modify: (content: string) => {
				return content.replace('__PORT__', JSON.stringify(port));
			},
		})
		.set('public/asciidoctor-dev-render.css', {
			contentType: 'text/css',
		})
		.set('public/asciidoctor-dev-self-page.css', {
			contentType: 'text/css',
		})
		.set('public/render-styles.css', {
			contentType: 'text/css',
		})
		.set('node_modules/@asciidoctor/core/dist/css/asciidoctor.css', {
			contentType: 'text/css',
		});

	const middlewares = chain(
		logging(log),
		health(),
		reservedStatic({ files: _staticFiles, scriptDir: scriptDir }),
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
