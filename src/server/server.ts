import { Server } from 'node:http';
import { readFileSync } from 'node:fs';

import { AdocRenderer } from './asciidoctor.js';
import { HtmlRenderer } from './html.js';
import { Router } from './router.js';
import { HandlerFunc, Middleware } from './types/routing.js';

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

	private handleScripts = (): Middleware => {
		return (next: HandlerFunc): HandlerFunc => {
			return (req, res) => {
				if (this.clientSctiptPattern.test(req.url || '')) {
					const devClient = readFileSync(
						'./dist/client/@asciidoctor-dev-client.js',
						{ encoding: 'utf-8' },
					);

					const code = devClient.replace(
						'__PORT__',
						JSON.stringify(this.serverPort),
					);

					res.writeHead(200, {
						'content-type': 'text/javascript',
					}).end(code);

					return;
				}
				next(req, res);
			};
		};
	};

	private handleHome = (): Middleware => {
		return (next: HandlerFunc): HandlerFunc => {
			return (req, res) => {
				let url = req.url || '';

				url = url.replace(this.base, '');

				if (!url) {
					res.writeHead(200, { 'content-type': 'text/html' }).end(
						this.html.home(this.router.routes),
					);
					return;
				}

				next(req, res);
			};
		};
	};

	private handleRender: HandlerFunc = (req, res) => {
		try {
			let url = req.url || '';

			url = url.replace(this.base, '');

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
		} catch (e) {
			console.error(e);
		}

		function writeReponse(html: string) {
			res.writeHead(200, { 'content-type': 'text/html' }).end(html);
		}
	};

	private chain = (...xs: Middleware[]): Middleware => {
		return (next: HandlerFunc): HandlerFunc => {
			for (let i = xs.length - 1; i >= 0; i--) {
				const x = xs[i];
				next = x(next);
			}
			return next;
		};
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

		const chain = this.chain(this.handleScripts(), this.handleHome());

		this._server = new Server(chain(this.handleRender));
	}

	listen(cb?: () => void) {
		this._server.listen(this.serverPort, cb);
	}
}
