import { AsciiDoctorDevServerOptions } from './types/server-options.js';
import { createProcessor } from './asciidoctor.js';
import { createHtmlRenderer } from './html.js';
import { createRouter } from './router.js';
import { startWatcher } from './watcher.js';
import { createServer } from './server.js';
import { createWSServer } from './websocket.js';

import { cursorTo, clearScreenDown } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const httpPort = 8081;
const cwd = process.cwd(); // current working directory
const sd = dirname(fileURLToPath(import.meta.url)); // script directory

export function createDevServer(options?: AsciiDoctorDevServerOptions) {
	const router = createRouter({
		cwd: cwd,
	});
	const asciidoctor = createProcessor();
	const html = createHtmlRenderer({ router: router, sd: sd });

	const serverPort = options?.server?.port || httpPort;

	const devServer = createServer({
		settings: {
			port: serverPort,
			sd: sd,
		},
		asciidoctor,
		html,
		router,
	});

	const wss = createWSServer({ httpServer: devServer });

	startWatcher({ cwd, router, wss });

	devServer.listen(() => {
		clearScreen();
		console.log(
			// prettier-ignore
			'┏━━━┓━━┏┓━━━━━━━━┏━━━┓━━━━━━━━┏━━━┓━━━━━━━━━━━━━━━━━━' + '\n' + 
			'┃┏━┓┃━━┃┃━━━━━━━━┗┓┏┓┃━━━━━━━━┃┏━┓┃━━━━━━━━━━━━━━━━━━' + '\n' +
			'┃┃━┃┃┏━┛┃┏━━┓┏━━┓━┃┃┃┃┏━━┓┏┓┏┓┃┗━━┓┏━━┓┏━┓┏┓┏┓┏━━┓┏━┓' + '\n' +
			'┃┗━┛┃┃┏┓┃┃┏┓┃┃┏━┛━┃┃┃┃┃┏┓┃┃┗┛┃┗━━┓┃┃┏┓┃┃┏┛┃┗┛┃┃┏┓┃┃┏┛' + '\n' +
			'┃┏━┓┃┃┗┛┃┃┗┛┃┃┗━┓┏┛┗┛┃┃┃━┫┗┓┏┛┃┗━┛┃┃┃━┫┃┃━┗┓┏┛┃┃━┫┃┃━' + '\n' +
			'┗┛━┗┛┗━━┛┗━━┛┗━━┛┗━━━┛┗━━┛━┗┛━┗━━━┛┗━━┛┗┛━━┗┛━┗━━┛┗┛━' + '\n' +
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n' +
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n',
		);

		console.log(`AsciiDoctor Dev Server start on:\n`);
		console.log(`-> Local - http://localhost:${serverPort}`);
	});
}

function clearScreen() {
	const repeatCount = process.stdout.rows - 2;
	const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : '';
	console.log(blank);
	cursorTo(process.stdout, 0, 0);
	clearScreenDown(process.stdout);
}
