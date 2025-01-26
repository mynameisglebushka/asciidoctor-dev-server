import { readdir, readFileSync } from 'node:fs';
import { parse, join } from 'node:path';

export class Router {
	private readonly cwd: string;
	private readonly _routes: Map<string, string>;
	private readonly __routes: Map<string, { title: string; file: string }>;

	get routes(){
		return this.__routes;
	}

	constructor(cwd: string) {
		this.cwd = cwd;
		this._routes = new Map();
		this.__routes = new Map();

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
						if (
							/(^|[/\\])\../.test(_file) ||
							_file.includes('node_modules')
						)
							return;

						const ok = this.checkFile(_file);

						if (!ok) return;

						const { route, file } = ok;

						const content = readFileSync(_file, {
							encoding: 'utf-8',
						});

						const regRes = /^= ([^\n]+)/.exec(content);

						let title: string = '';

						if (regRes && regRes.length === 2) {
							title = regRes[1];
						}

						if (!this.__routes.has(route)) {
							this.__routes.set(route, {
								file: file,
								title: title,
							});
						}

						if (!this._routes.has(route)) {
							this._routes.set(route, file);
						}
					});
				}
			},
		);
	}

	insertRoute(filePath: string): void {
		const ok = this.checkFile(filePath);

		if (!ok) return;

		const { route, file } = ok;

		if (!this._routes.has(route)) {
			this._routes.set(route, file);
		}
	}

	removeRoute(removedFile: string): void {
		const ok = this.checkFile(removedFile);

		if (!ok) return;

		const { route } = ok;

		this._routes.delete(route);
	}

	getFilePath(url: string): string | undefined {
		return this._routes.get(url);
	}

	private checkFile(path: string) {
		const pp = parse(path);

		if (pp.ext !== '.adoc') return;

		return {
			route: join(pp.dir, pp.name),
			file: join(pp.dir, pp.base),
		};
	}
}
