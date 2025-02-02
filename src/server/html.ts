import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Router } from './router';
import { resolve } from 'node:path';

export interface HtmlRenderer {
	home(): string;
	notFound(url: string): string;
	render(html: string): string;
}

interface HtmlRendererOptions {
	router: Router;
	sd: string;
}

export function createHtmlRenderer(opts: HtmlRendererOptions): HtmlRenderer {
	const router = opts.router;
	const scriptDir = opts.sd;

	const homeTemplate = readFileSync(
		resolve(scriptDir, '../../public/home_page.html'),
		{
			encoding: 'utf-8',
		},
	);
	const notFoundTemplate = readFileSync(
		resolve(scriptDir, '../../public/notfound_page.html'),
		{
			encoding: 'utf-8',
		},
	);
	const renderedTemplate = readFileSync(
		resolve(scriptDir, '../../public/rendered_page.html'),
		{
			encoding: 'utf-8',
		},
	);

	const builder = routerBuilder(router);

	const html: HtmlRenderer = {
		home(): string {
			const result: string = '';

			return homeTemplate
				.replace(`<!--app-html-->`, result)
				.replace('<!--navigation-->', builder());
		},
		notFound(url: string): string {
			const result: string = `<h1>Nothing was found on the ${url || '/'}</h1>`;

			return notFoundTemplate
				.replace(`<!--app-html-->`, result)
				.replace('<!--navigation-->', builder());
		},
		render(html: string): string {
			const _html = new JSDOM(html, {
				contentType: 'text/html',
			});

			return renderedTemplate
				.replace(
					`<!--app-head-->`,
					_html.window.document.head.innerHTML,
				)
				.replace('<!--navigation-->', builder())
				.replace(
					`<!--app-html-->`,
					_html.window.document.body.innerHTML,
				);
		},
	};

	return html;
}

const routerBuilder = (router: Router) => {
	return () => {
		let r: string = '';

		router.routes.forEach((v, k) => {
			r += `<div class="navigation-link"><span>${v.file}:</span><a href="${k}">${v.title || 'title not found'}</a></div>`;
		});

		return r;
	};
};
