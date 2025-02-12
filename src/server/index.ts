import { AsciiDoctorDevServerOptions } from './types/server-options.js';
import { createProcessor } from './asciidoctor.js';
import { createHtmlRenderer } from './html.js';
import { createRouter } from './router.js';
import { startWatcher } from './watcher.js';
import { createServer } from './server.js';
import { createWSServer } from './websocket.js';

import { cursorTo, clearScreenDown } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { createLogger } from './logger.js';
import { statSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { cwd } from 'node:process';
import { resolveConfig } from './config.js';

const default_server_port = 8081;
const configName = '.ads.config.js';

export async function createDevServer(
	options: AsciiDoctorDevServerOptions = {},
) {
	const logger = createLogger({ debug: options.debug || false });

	const current_workind_directory = process.cwd();
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

	const _config = await resolveConfig(finalConfig, script_directory, options);
	if (typeof _config === 'string') {
		logger.error(_config);
		return;
	}

	// TODO: Убрать после безобразия
	if (typeof _config !== 'string') {
		logger.debug(`config ${JSON.stringify(_config)}`);
		return;
	}

	let content_directory = '';
	if (options.workingDirectory) {
		const stat = statSync(options.workingDirectory, {
			throwIfNoEntry: false,
		});

		if (!stat) {
			logger.error(`no such directory -> ${options.workingDirectory}`);
			return;
		}

		if (!stat.isDirectory()) {
			logger.error(`path ${options.workingDirectory} is not a directory`);
			return;
		}

		content_directory = options.workingDirectory;
	} else {
		content_directory = current_workind_directory;
	}

	const asciidoctor = createProcessor();
	const router = createRouter({
		logger,
		cwd: current_workind_directory,
		asciidoctor,
		path: content_directory,
	});
	const html = createHtmlRenderer({ router: router, sd: script_directory });

	const port = options.server?.port || default_server_port;

	const devServer = createServer({
		logger,
		settings: {
			port,
			sd: script_directory,
		},
		asciidoctor,
		html,
		router,
	});

	const wss = createWSServer({ httpServer: devServer });

	startWatcher({ logger, path: content_directory, router, wss });

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
		console.log(`-> Local - http://localhost:${port}`);
	});
}
