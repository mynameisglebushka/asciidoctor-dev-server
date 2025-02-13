import chokidar from 'chokidar';
import { Router } from './router.js';
import { WSServer } from './websocket.js';
import {
	FileAddEvent,
	FileChangeEvent,
	FileRemovedEvent,
	socketEvent,
} from '../shared/types/websocket-event.js';
import { Logger } from './logger.js';
import { ResolvedConfig } from './config.js';

// export interface _Wathcer {

// }

interface WatcherOptions {
	logger: Logger;
	config: ResolvedConfig;
	router: Router;
	wss: WSServer;
}

export function startWatcher(opts: WatcherOptions) {
	const log = opts.logger.with('watcher');

	const router = opts.router;
	const wss = opts.wss;

	const path = opts.config.dirs.content_dir;

	const watcher = chokidar.watch('.', {
		ignored: [/(^|[/\\])\../, 'node_modules'],
		cwd: path,
		ignoreInitial: true,
	});

	watcher.on('add', (path) => {
		log.debug(`watcher find new file ${path}`);
		const _route = router.insertRoute(path);

		if (!_route) return;

		wss.sendEventToAllConnectedClients(
			socketEvent<FileAddEvent>({
				type: 'file_added',
				data: {
					route: _route.route,
					file: _route.file,
					title: _route.title,
				},
			}),
		);
	});

	watcher.on('unlink', (path: string) => {
		log.debug(`watcher find file ${path} was removed`);
		if (!router.removeRouteByFile(path)) return;

		wss.sendEventToAllConnectedClients(
			socketEvent<FileRemovedEvent>({
				type: 'file_remove',
				data: { file: path },
			}),
		);
	});

	watcher.on('change', (path: string) => {
		log.debug(`watcher find file ${path} was changed`);
		const _route = router.getRouteByFilePath(path);

		if (!_route) return;

		wss.sendEventToAllConnectedClients(
			socketEvent<FileChangeEvent>({
				type: 'file_change',
				data: { route: _route.route },
			}),
		);
	});
}
