import chokidar, { FSWatcher } from 'chokidar';
import { Router } from './router.js';
import { WSServer } from './websocket.js';

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
			ignored: [/^\./, /node_modules/],
			cwd: this.cwd,
		});

		this.watcher.on('add', (path) => {
			this.router.insertRoute(path);
		});

		this.watcher.on('unlink', (path: string) => {
			this.router.removeRoute(path);
		});

		this.watcher.on('change', () => {
			this.wss.sendEventToAllConnectedClients({
				type: 'reload',
			});
		});
	}
}
