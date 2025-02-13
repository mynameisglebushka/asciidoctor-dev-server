import { AsciiDoctorDevServerOptions } from './types/server-options.js';
import { createProcessor } from './asciidoctor.js';
import { createHtmlRenderer } from './html.js';
import { createRouter } from './router.js';
import { startWatcher } from './watcher.js';
import { createServer } from './server.js';
import { createWSServer } from './websocket.js';
import { createLogger } from './logger.js';
import { resolveConfig } from './config.js';

import { cursorTo, clearScreenDown } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { cwd } from 'node:process';

const configName = '.ads.config.js';

export async function createDevServer(
	options: AsciiDoctorDevServerOptions = {},
) {
	const logger = createLogger({ debug: options.debug || false });

	const configLocations = [
		join(cwd(), configName),
		join(homedir() + '.ads/', configName),
	];

	let finalConfig = '';
	for (const idx in configLocations) {
		const maybeConfig = configLocations[idx];

		if (existsSync(maybeConfig)) {
			finalConfig = maybeConfig;
			break;
		}
	}

	const script_directory = resolve(
		dirname(fileURLToPath(import.meta.url)),
		'../..',
	);

	const config = await resolveConfig(finalConfig, script_directory, options);
	if (typeof config === 'string') {
		logger.error(config);
		return;
	}

	const asciidoctor = createProcessor({ config });

	const router = createRouter({
		logger,
		config,
		asciidoctor,
	});

	const html = createHtmlRenderer({ router, config });

	const devServer = createServer({
		logger,
		config,
		asciidoctor,
		html,
		router,
	});

	const wss = createWSServer({ httpServer: devServer });

	startWatcher({ logger, config, router, wss });

	devServer.listen(() => {
		const repeatCount = process.stdout.rows - 2;
		const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : '';
		console.log(blank);
		cursorTo(process.stdout, 0, 0);
		clearScreenDown(process.stdout);

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
		console.log(`-> Local - http://localhost:${config.server.port}`);
	});
}
