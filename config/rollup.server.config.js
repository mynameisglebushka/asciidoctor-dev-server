import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { resolve as path_resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: path_resolve(__dirname, '../src/server/index.ts'),
	output: {
		dir: path_resolve(__dirname, '../dist/server'),
		format: 'esm',
		sourcemap: true,
	},
	plugins: [
		typescript({
			tsconfig: path_resolve(__dirname, './tsconfig.server.json'),
		}),
		commonjs(),
	],
	external: [
		'picocolors',
		'mime-types',
		'ws',
		'chokidar',
		'asciidoctor-kroki',
		'@asciidoctor/core',
		'jsdom',
		/^node:/,
	],
};

export default config;
