import { IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFileSync } from 'node:fs';

import { AdocRenderer } from './asciidoctor.js';
import { HtmlRenderer } from './html.js';
import { Router } from './router.js';

export class DevServer {
	private clientSctiptPattern = /@asciidoctor-dev-client/;
	private base = '/';
	private serverPort: number;

	private asciidoctor: AdocRenderer;
	private html: HtmlRenderer;
	private router: Router;

	private _server: Server;

	get server() {
		return this._server;
	}

	private handler = (req: IncomingMessage, res: ServerResponse) => {
		try {
			let url = req.url;

			if (!url) return;

			if (this.clientSctiptPattern.test(url)) {
				const devClient = readFileSync(
					'./dist/client/@asciidoctor-dev-client.js',
					{ encoding: 'utf-8' },
				);

				const code = devClient.replace(
					'__PORT__',
					JSON.stringify(this.serverPort),
				);

				handleScript(code);

				return;
			}

			url = url.replace(this.base, '');

			if (!url) {
				writeReponse(this.html.home(this.router.routes));
				return;
			}

			const path = this.router.getFilePath(url);
			if (!path) {
				writeReponse(this.html.notFound(url, this.router.routes));
				return;
			}

			const convertedDocument = this.asciidoctor.convert(path);

			if (!convertedDocument) {
				res.writeHead(500).end('Failed');
				return;
			}

			writeReponse(this.html.render(convertedDocument));
		} catch (error) {
			const e = error as Error;
			console.error(e.stack);

			res.writeHead(500).end(e.stack);
		}

		function writeReponse(html: string) {
			res.writeHead(200, { 'content-type': 'text/html' }).end(html);
		}

		function handleScript(script: string) {
			res.writeHead(200, { 'content-type': 'text/javascript' }).end(
				script,
			);
		}
	};

	constructor(
		opts: { port: number },
		asciidoctor: AdocRenderer,
		html: HtmlRenderer,
		router: Router,
	) {
		this.serverPort = opts.port;
		this.asciidoctor = asciidoctor;
		this.html = html;
		this.router = router;

		this._server = new Server(this.handler);
	}

	listen(cb?: () => void) {
		this._server.listen(this.serverPort, cb);
	}
}
