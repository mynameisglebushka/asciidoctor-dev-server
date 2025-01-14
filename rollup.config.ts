import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';

const clientConfig = defineConfig({
	input: {
		'asciidoctor-dev-client': 'src/client/asciidoctor-dev-client.ts',
	},
	output: {
		dir: './dist',
		format: 'module',
		entryFileNames: 'client/@[name].js',
	},
	plugins: [typescript()],
});

const serverConfig = defineConfig({
	input: 'src/server/index.ts',
	output: {
		file: './dist/server/index.js',
		format: 'module',
	},
	plugins: [typescript()],
});

export default defineConfig([clientConfig, serverConfig]);
