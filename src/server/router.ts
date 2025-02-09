import { readdir } from 'node:fs';
import { parse, join, resolve } from 'node:path';
import { Logger } from './logger';
import { AsciidoctorProcessor, IncludedFile } from './asciidoctor';

type RouterMap = Map<string, RouteInfo>;

interface Route extends RouteInfo {
	route: string;
}

interface RouteInfo {
	file: string;
	title?: string;
	absPath: string;
	includedFiles?: IncludedFile[];
}

export interface Router {
	readonly routes: RouterMap;
	insertRoute(file: string): Route | undefined;
	removeRouteByFile(file: string): boolean;
	getFilePath(route: string): string | undefined;
	getRouteByFilePath(file: string): Route | undefined;
	getAbsPathByRoute(route: string): string | undefined;
}

interface RouterOptions {
	logger: Logger;
	asciidoctor: AsciidoctorProcessor;
	cwd: string;
	path: string;
}

export function createRouter(opts: RouterOptions): Router {
	const log = opts.logger.with('router');
	const processor = opts.asciidoctor;

	const cwd = opts.cwd;
	const path = opts.path;

	const checkFile = (_file: string) => {
		if (/(^|[/\\])\../.test(_file) || _file.includes('node_modules'))
			return;

		const pp = parse(_file);

		if (pp.ext !== '.adoc') return;

		return {
			route: '/' + join(pp.dir, pp.name),
			file: join(pp.dir, pp.base),
			absPath: resolve(cwd, path, join(pp.dir, pp.base)),
		};
	};

	const routerMap: RouterMap = new Map();

	function insertRoute(_file: string): Route | undefined {
		const ok = checkFile(_file);

		if (!ok) {
			return;
		}

		const { route, file, absPath } = ok;

		const { title, included_files } = processor.collectFileInfo(absPath);

		if (routerMap.has(route)) {
			log.debug(`file ${_file} already exist in router by ${route} path`);
			return;
		}

		const routeInfo: RouteInfo = {
			file: file,
			title: title,
			includedFiles: included_files,
			absPath,
		};

		routerMap.set(route, routeInfo);

		log.debug(`file ${file} setup in router on ${route} path`);

		return {
			route: route,
			...routeInfo,
		};
	}

	function removeRouteByFile(_file: string): boolean {
		const ok = checkFile(_file);

		if (!ok) return false;

		const { route } = ok;

		const isRemove = routerMap.delete(route);

		const logMsg = isRemove
			? `${_file} deleted from router with ${route} route`
			: `${_file} NOT deleted from router with ${route} route`;

		log.debug(logMsg);

		return isRemove;
	}

	function getFileByRoute(route: string): string | undefined {
		const r = routerMap.get(route);

		return r ? r.file : undefined;
	}

	function getAbsPathByRoute(route: string): string | undefined {
		const r = routerMap.get(route);

		return r ? r.absPath : undefined;
	}

	function getRouteByFile(file: string): Route | undefined {
		for (const [route, info] of routerMap) {
			if (info.file === file) {
				return {
					route,
					...info,
				};
			}
		}

		return undefined;
	}

	const router: Router = {
		routes: routerMap,
		insertRoute: insertRoute,
		removeRouteByFile: removeRouteByFile,
		getFilePath: getFileByRoute,
		getRouteByFilePath: getRouteByFile,
		getAbsPathByRoute: getAbsPathByRoute,
	};

	readdir(path, { recursive: true, encoding: 'utf-8' }, (err, files) => {
		if (err) console.log(err);
		else {
			files.forEach((_file) => {
				router.insertRoute(_file);
			});
		}
	});

	return router;
}
