import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Router } from './router';
import { resolve } from 'node:path';

export class HtmlRenderer {
	private router: Router;
	private homeTemplate: string;
	private notFoundTemplate: string;
	private renderedTemplate: string;
	private plainTemplate: string;

	constructor(router: Router, sd: string) {
		this.router = router;

		this.homeTemplate = readFileSync(
			resolve(sd, '../../public/home_page.html'),
			{
				encoding: 'utf-8',
			},
		);

		this.notFoundTemplate = readFileSync(
			resolve(sd, '../../public/notfound_page.html'),
			{
				encoding: 'utf-8',
			},
		);

		this.renderedTemplate = readFileSync(
			resolve(sd, '../../public/rendered_page.html'),
			{
				encoding: 'utf-8',
			},
		);

		this.plainTemplate = readFileSync(
			resolve(sd, '../../public/plain_page.html'),
			{
				encoding: 'utf-8',
			},
		);
	}

	public home(): string {
		const result: string = '';

		return this.homeTemplate
			.replace(`<!--app-html-->`, result)
			.replace('<!--router-->', this.buildRoutes());
	}

	public notFound(url: string): string {
		const result: string = `<h1>Nothing was found on the ${url || '/'}</h1>`;

		return this.notFoundTemplate
			.replace(`<!--app-html-->`, result)
			.replace('<!--router-->', this.buildRoutes());
	}

	public render(asciidocHtml: string): string {
		const html = new JSDOM(asciidocHtml, {
			contentType: 'text/html',
		});

		return this.renderedTemplate
			.replace(`<!--app-head-->`, html.window.document.head.innerHTML)
			.replace('<!--router-->', this.buildRoutes())
			.replace(`<!--app-html-->`, html.window.document.body.innerHTML);
	}

	public plain() {}

	private buildRoutes(): string {
		let r: string = '';

		this.router.routes.forEach((v, k) => {
			r += `<div class="router-link"><span>${v.file}:</span><a href="${k}">${v.title || 'title not found'}</a></div>`;
		});

		return r;
	}
}
