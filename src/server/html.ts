import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { JSDOM } from 'jsdom';
import { Router } from './router';

export class HtmlRenderer {
	private router: Router;
	private homeTemplate: string;
	private notFoundTemplate: string;
	private renderedTemplate: string;
	private plainTemplate: string;

	constructor(router: Router) {
		this.router = router;

		this.homeTemplate = readFileSync('./public/home_page.html', {
			encoding: 'utf-8',
		});

		this.notFoundTemplate = readFileSync('./public/notfound_page.html', {
			encoding: 'utf-8',
		});

		this.renderedTemplate = readFileSync('./public/rendered_page.html', {
			encoding: 'utf-8',
		});

		this.plainTemplate = readFileSync('./public/plain_page.html', {
			encoding: 'utf-8',
		});
	}

	public home(): string {
		let result: string = '';

		this.router.routes.forEach((v, k) => {
			result += `<span><a href="/${k}">${k}</a> => ${basename(v.file)}</span>`;
		});

		return this.homeTemplate.replace(`<!--app-html-->`, result);
	}

	public notFound(url: string): string {
		let result: string = `<h1>Nothing was found on the ${url || '/'}</h1>`;

		this.router.routes.forEach((v, k) => {
			result += `<span><a href="/${k}">${k}</a> => ${basename(v.file)}</span>`;
		});

		return this.notFoundTemplate.replace(`<!--app-html-->`, result);
	}

	public render(asciidocHtml: string): string {
		const html = new JSDOM(asciidocHtml, {
			contentType: 'text/html',
		});

		let r: string = '';

		this.router.routes.forEach((v, k) => {
			r += `<div class="router-link"><span>${v.file}:</span><a href="/${k}">${v.title || 'title not found'}</a></div>`;
		});

		return this.renderedTemplate
			.replace(`<!--app-head-->`, html.window.document.head.innerHTML)
			.replace('<!--router-->', r)
			.replace(`<!--app-html-->`, html.window.document.body.innerHTML);
	}

	public plain() {}
}
