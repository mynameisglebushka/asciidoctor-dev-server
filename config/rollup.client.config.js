import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { resolve as path_resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * @type {import('rollup').RollupOptions}
 */
const config = {
	input: {
		'asciidoctor-dev-client': path_resolve(
			__dirname,
			'../src/client/asciidoctor-dev-client.ts',
		),
	},
	output: {
		dir: path_resolve(__dirname, '../dist/client'),
		format: 'module',
		entryFileNames: '@[name].js',
	},
	plugins: [
		typescript({
			tsconfig: path_resolve(__dirname, './tsconfig.client.json'),
		}),
		resolve(),
	],
};

export default config;
