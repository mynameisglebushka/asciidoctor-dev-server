import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { JSDOM } from 'jsdom';

export class HtmlRenderer {
	private homeTemplate: string;
	private notFoundTemplate: string;
	private renderedTemplate: string;
	private plainTemplate: string;

	constructor() {
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

	public home(routes: Map<string, string>): string {
		let result: string = '';

		routes.forEach((v: string, k: string) => {
			result += `<span><a href="/${k}">${k}</a> => ${basename(v)}</span>`;
		});

		return this.homeTemplate.replace(`<!--app-html-->`, result);
	}

	public notFound(url: string, routes: Map<string, string>): string {
		let result: string = `<h1>Nothing was found on the ${url || '/'}</h1>`;

		routes.forEach((v: string, k: string) => {
			result += `<span><a href="/${k}">${k}</a> => ${basename(v)}</span>`;
		});

		return this.notFoundTemplate.replace(`<!--app-html-->`, result);
	}

	public render(asciidocHtml: string): string {
		const html = new JSDOM(asciidocHtml, {
			contentType: 'text/html',
		});

		return this.renderedTemplate
			.replace(`<!--app-head-->`, html.window.document.head.innerHTML)
			.replace(`<!--app-html-->`, html.window.document.body.innerHTML);
	}

	public plain() {}
}
