import { Server } from 'node:http';
import { readFileSync } from 'node:fs';

import { AdocRenderer } from './asciidoctor.js';
import { HtmlRenderer } from './html.js';
import { Router } from './router.js';
import { HandlerFunc, Middleware } from './types/routing.js';
import { resolve } from 'node:path';

export class DevServer {
	private staticFiles: Map<
		RegExp,
		{
			path: string;
			contentType: string;
			modify?: (content: string) => string;
		}
	>;

	private serverPort: number;

	private asciidoctor: AdocRenderer;
	private html: HtmlRenderer;
	private router: Router;

	private _server: Server;

	get server() {
		return this._server;
	}

	private handleStaticFile = (): Middleware => {
		return (next: HandlerFunc): HandlerFunc => {
			return (req, res) => {
				if (req.url === undefined) {
					next(req, res);
					return;
				}

				let content: string = '';
				let contentType: string = '';

				this.staticFiles.forEach((val, pattern) => {
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

	private handleHome = (): Middleware => {
		return (next: HandlerFunc): HandlerFunc => {
			return (req, res) => {
				const url = req.url;

				if (!url) {
					res.writeHead(200, { 'content-type': 'text/html' }).end(
						this.html.home(),
					);
					return;
				}

				next(req, res);
			};
		};
	};

	private handleRender: HandlerFunc = (req, res) => {
		try {
			const url = req.url || '/';

			const path = this.router.getFilePath(url);
			if (!path) {
				writeReponse(this.html.notFound(url));
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
		opts: { port: number; sd: string },
		asciidoctor: AdocRenderer,
		html: HtmlRenderer,
		router: Router,
	) {
		this.serverPort = opts.port;
		this.asciidoctor = asciidoctor;
		this.html = html;
		this.router = router;

		this.staticFiles = new Map()
			.set(/@asciidoctor-dev-client/, {
				path: resolve(opts.sd, '../client/@asciidoctor-dev-client.js'),
				contentType: 'text/javascript',
				modify: (content: string) => {
					return content.replace(
						'__PORT__',
						JSON.stringify(this.serverPort),
					);
				},
			})
			.set(/@asciidoctor-dev-render-style/, {
				path: resolve(
					opts.sd,
					'../../public/asciidoctor-dev-render.css',
				),
				contentType: 'text/css',
			})
			.set(/@asciidoctor-dev-self-page-style/, {
				path: resolve(
					opts.sd,
					'../../public/asciidoctor-dev-self-page.css',
				),
				contentType: 'text/css',
			});

		const chain = this.chain(this.handleStaticFile(), this.handleHome());

		this._server = new Server(chain(this.handleRender));
	}

	listen(cb?: () => void) {
		this._server.listen(this.serverPort, cb);
	}
}
