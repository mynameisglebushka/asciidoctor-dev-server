import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import { resolve as path_resolve } from 'node:path';

export default {
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
		sourcemap: true,
	},
	plugins: [
		typescript({
			tsconfig: (() => {
				const a = path_resolve(__dirname, './tsconfig.client.json');
				console.log(a);
				return a;
			})(),
		}),
		resolve(),
	],
};
