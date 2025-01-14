import { readdir } from 'node:fs';
import { parse, join } from 'node:path';

export class Router {
	private readonly cwd: string;
	private readonly _routes: Map<string, string>;

	get routes(): Map<string, string> {
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
						if (
							_file.includes('node_modules') ||
							_file.includes('node_modules')
						)
							return;

						const ok = this.checkFile(_file);

						if (!ok) return;

						const { route, file } = ok;

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
