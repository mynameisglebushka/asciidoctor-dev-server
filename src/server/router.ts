import { readdir, readFileSync } from 'node:fs';
import { parse, join } from 'node:path';

export class Router {
	private readonly cwd: string;
	private readonly _routes: Map<string, { title: string; file: string }>;

	get routes() {
		return this._routes;
	}

	constructor(cwd: string) {
		this.cwd = cwd;
		this._routes = new Map();

		this.setupRouter();
	}

	private setupRouter() {
		readdir(
			this.cwd,
			{ recursive: true, encoding: 'utf-8' },
			(err, files) => {
				if (err) console.log(err);
				else {
					files.forEach((_file) => {
						this.insertRoute(_file);
					});
				}
			},
		);
	}

	insertRoute(filePath: string) {
		const ok = this.checkFile(filePath);

		if (!ok) return;

		const { route, file } = ok;

		const title = this.getTitle(filePath);

		if (!this._routes.has(route)) {
			this._routes.set(route, {
				file: file,
				title: title,
			});
		}

		return {
			route: route,
			file: file,
			title: title,
		};
	}

	removeRoute(removedFile: string): boolean {
		const ok = this.checkFile(removedFile);

		if (!ok) return false;

		const { route } = ok;

		return this._routes.delete(route);
	}

	getFilePath(url: string): string | undefined {
		const r = this._routes.get(url);

		if (!r) return;

		return r.file;
	}

	getRouteByFilePath(
		file: string,
	): { route: string; file: string } | undefined {
		let r: { route: string; file: string } | undefined = undefined;

		this._routes.forEach((v, k) => {
			if (r) return;

			if (v.file === file) {
				r = {
					route: k,
					file: v.file,
				};
			}
		});

		return r;
	}

	private checkFile(path: string) {
		if (/(^|[/\\])\../.test(path) || path.includes('node_modules')) return;

		const pp = parse(path);

		if (pp.ext !== '.adoc') return;

		return {
			route: '/' + join(pp.dir, pp.name),
			file: join(pp.dir, pp.base),
		};
	}

	private getTitle(path: string) {
		const content = readFileSync(path, {
			encoding: 'utf-8',
		});

		const regRes = /^= ([^\n]+)/.exec(content);

		let title: string = '';

		if (regRes && regRes.length === 2) {
			title = regRes[1];
		}

		return title;
	}
}
