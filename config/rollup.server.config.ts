import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { resolve as path_resolve } from 'node:path';

export default {
	input: path_resolve(__dirname, '../src/server/index.ts'),
	output: {
		dir: path_resolve(__dirname, '../dist/server'),
		format: 'esm',
		sourcemap: true,
	},
	plugins: [
		typescript({
			tsconfig: path_resolve(__dirname, './tsconfig.server.json'),
		})
	],
};
