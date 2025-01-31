import chokidar, { FSWatcher } from 'chokidar';
import { Router } from './router.js';
import { WSServer } from './websocket.js';
import {
	FileAddEvent,
	FileChangeEvent,
	FileRemovedEvent,
	socketEvent,
} from '../shared/types/websocket-event.js';

export class Watcher {
	private cwd: string;

	private router: Router;
	private wss: WSServer;

	private watcher: FSWatcher;

	constructor(cwd: string, router: Router, wss: WSServer) {
		this.cwd = cwd;

		this.router = router;
		this.wss = wss;

		this.watcher = chokidar.watch(this.cwd, {
			ignored: [/(^|[/\\])\../, 'node_modules'],
			cwd: this.cwd,
		});

		this.watcher.on('add', (path) => {
			const _route = this.router.insertRoute(path);

			if (!_route) return;

			this.wss.sendEventToAllConnectedClients(
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

		this.watcher.on('unlink', (path: string) => {
			if (!this.router.removeRoute(path)) return;

			this.wss.sendEventToAllConnectedClients(
				socketEvent<FileRemovedEvent>({
					type: 'file_remove',
					data: { file: path },
				}),
			);
		});

		this.watcher.on('change', (path: string) => {
			const _route = this.router.getRouteByFilePath(path);

			if (!_route) return;

			this.wss.sendEventToAllConnectedClients(
				socketEvent<FileChangeEvent>({
					type: 'file_change',
					data: { route: _route.route },
				}),
			);
		});
	}
}
