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

const configFiles = ['.ads.config.js', '.ads.config.cjs', '.ads.config.mjs'];

export async function createDevServer(
	options: AsciiDoctorDevServerOptions = {},
) {
	const logger = createLogger({ debug: options.debug || false });

	let finalConfig = '';
	if (options.configPath === undefined) {
		const configDirs = [cwd(), join(homedir(), '.ads/')];

		for (const i in configDirs) {
			for (const j in configFiles) {
				const maybeConfig = join(configDirs[i], configFiles[j]);

				if (existsSync(maybeConfig)) {
					finalConfig = maybeConfig;
					break;
				}
			}
		}

		logger.debug(
			`${finalConfig === '' ? 'no config files on default paths' : `use config file on "${finalConfig}"`}`,
		);
	} else if (options.configPath !== '') {
		if (!existsSync(options.configPath)) {
			logger.error(`no config on "${options.configPath}"`);
			return;
		}

		finalConfig = options.configPath;
		logger.debug(`run with ${finalConfig} config file`);
	} else {
		logger.debug('run on default settings');
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

	const wss = createWSServer({ logger, httpServer: devServer });

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
