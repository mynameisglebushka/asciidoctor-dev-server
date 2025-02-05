#!/usr/bin/env node

import { createDevServer } from '../dist/server/index.js';

process.title = 'asciidoctor-dev-server';

const args = process.argv.slice(2);

/**
 * @type {import('../src/server/types/server-options.js').AsciiDoctorDevServerOptions}
 */
const opts = {};

if (args) {
	args.forEach((arg) => {
		if (arg === '--debug' || arg === '-d') {
			opts.debug = true;
		}
	});
}

createDevServer(opts);
