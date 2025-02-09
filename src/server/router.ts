import { readdir } from 'node:fs';
import { parse, join } from 'node:path';
import { Logger } from './logger';
import { AsciidoctorProcessor } from './asciidoctor';

interface Route {
	route: string;
	file: string;
	title?: string;
}

export interface Router {
	readonly routes: Map<string, { title: string; file: string }>;
	insertRoute(file: string): Route | undefined;
	removeRouteByFile(file: string): boolean;
	getFilePath(route: string): string | undefined;
	getRouteByFilePath(file: string): Route | undefined;
}

interface RouterOptions {
	logger: Logger;
	cwd: string;
	asciidoctor: AsciidoctorProcessor;
}

export function createRouter(opts: RouterOptions): Router {
	const log = opts.logger.with('router');

	const router: Router = {
		routes: new Map(),
		insertRoute(this: Router, _file: string): Route | undefined {
			const ok = checkFile(_file);

			if (!ok) {
				return;
			}

			const { route, file } = ok;

			const fileInfo = opts.asciidoctor.load(_file);

			if (!this.routes.has(route)) {
				this.routes.set(route, {
					file: file,
					title: fileInfo.title || '',
				});

				log.debug(`file ${file} setup in router on ${route} path`);

				return {
					route: route,
					file: file,
					title: fileInfo.title,
				};
			}

			log.debug(`file ${_file} already exist in router by ${route} path`);
		},

		removeRouteByFile(this: Router, removedFile: string): boolean {
			const ok = checkFile(removedFile);

			if (!ok) return false;

			const { route } = ok;

			if (this.routes.delete(route)) {
				log.debug(
					`${removedFile} deleted from router with ${route} route`,
				);
				return true;
			} else {
				log.debug(
					`${removedFile} NOT deleted from router with ${route} route`,
				);
				return false;
			}
		},

		getFilePath(this: Router, url: string): string | undefined {
			const r = this.routes.get(url);

			if (!r) return;

			return r.file;
		},

		getRouteByFilePath(this: Router, file: string): Route | undefined {
			let r: Route | undefined = undefined;

			this.routes.forEach((v, k) => {
				if (r) return;

				if (v.file === file) {
					r = {
						route: k,
						file: v.file,
						title: v.title,
					};
				}
			});

			return r;
		},
	};

	readdir(opts.cwd, { recursive: true, encoding: 'utf-8' }, (err, files) => {
		if (err) console.log(err);
		else {
			files.forEach((_file) => {
				router.insertRoute(_file);
			});
		}
	});

	return router;
}

const checkFile = (path: string) => {
	if (/(^|[/\\])\../.test(path) || path.includes('node_modules')) return;

	const pp = parse(path);

	if (pp.ext !== '.adoc') return;

	return {
		route: '/' + join(pp.dir, pp.name),
		file: join(pp.dir, pp.base),
	};
};
