#!/usr/bin/env node

import { createDevServer } from '../dist/server/index.js';

process.title = 'asciidoctor-dev-server';

const args = process.argv.slice(2);

/**
 * @type {import('../src/server/types/server-options.js').AsciiDoctorDevServerOptions}
 */
const opts = {};

let errorHappend = '';

if (args) {
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === '--debug' || arg === '-d') {
			opts.debug = true;
			continue;
		}

		if (arg === '--help' || arg === '-h') {
			console.log(
				// prettier-ignore
				'asciidoctor-dev-server [-p] [-d] [dir]' + '\n' +
                'Flags:' + '\n' +
                '   -p --port : specify server port (default 8081)' + '\n' +
                '   -d --debug : debug flag for extra log (default false)' + '\n' +
                '   -h --help : show help output' + '\n' +
                'Args:' + '\n' +
                '   dir : content root directory (default cwd)',
			);
			errorHappend = 'ended by help :)';
			break;
		}

		if (arg === '--port' || arg === '-p') {
			if (i + 1 >= args.length) {
				errorHappend = 'port value is not defined';
				break;
			}

			const sPort = args[i + 1];
			const port = parseInt(sPort);

			if (isNaN(port)) {
				errorHappend = 'port value is not a number';
				break;
			}

			if (opts.server) {
				opts.server.port = port;
			} else {
				opts.server = {};
				opts.server.port = port;
			}

			i++;
			continue;
		}

		opts.workingDirectory = arg;
	}
}

if (!errorHappend) {
	createDevServer(opts);
}

console.error(errorHappend);
