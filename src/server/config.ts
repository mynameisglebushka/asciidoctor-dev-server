import { Extensions } from '@asciidoctor/core';
import { dirname, resolve } from 'node:path';
import { AsciiDoctorDevServerOptions } from './types/server-options';
import { statSync } from 'node:fs';

interface AsciidoctorAttributes {
	[key: string]: unknown;
}

type ExtensionsFunc = (registry: Extensions.Registry) => void;
type Matcher = string | RegExp;

export interface AsciiDoctorDevServerConfig {
	asciidoctor?: {
		safe?: string | number;
		attributes?: AsciidoctorAttributes;
		extensions?: ExtensionsFunc;
	};
	server_port?: number;
	ignored_content?: Matcher[];
}

export interface ResolvedConfig {
	dirs: {
		current_working_directory: string;
		content_dir: string;
		script_dir: string;
		config_dir: string;
	};
	server: {
		port: number;
	};
	content?: {
		ingnored: Matcher[];
	};
	asciidoctor: {
		safe: string | number;
		attributes: AsciidoctorAttributes;
		extensions?: ExtensionsFunc;
	};
}

const defaultConfig = Object.freeze({
	asciidoctor: {
		safe: 'safe',
		attributes: {
			stylesdir: '/__ads/node_modules/@asciidoctor/core/dist/css',
			stylesheet: 'asciidoctor.css',
			linkcss: true,
		},
	},
	server_port: 8081,
} satisfies AsciiDoctorDevServerConfig);

export async function resolveConfig(
	configPath: string,
	scriptDir: string,
	serverOptions: AsciiDoctorDevServerOptions,
): Promise<ResolvedConfig | string> {
	let configModule: { default: AsciiDoctorDevServerConfig } = { default: {} };

	if (configPath !== '') {
		configModule = await import(configPath);
	}

	const config = configModule.default ?? {};

	const adocAttrs = resolveAsciidoctorAttributes(
		config.asciidoctor?.attributes,
	);

	const current_workind_directory = process.cwd();
	let content_directory = '';
	if (serverOptions.workingDirectory) {
		const abs = resolve(
			current_workind_directory,
			serverOptions.workingDirectory,
		);
		const stat = statSync(abs, {
			throwIfNoEntry: false,
		});

		if (!stat) {
			return `no such directory -> ${serverOptions.workingDirectory}`;
		}

		if (!stat.isDirectory()) {
			return `path ${serverOptions.workingDirectory} is not a directory`;
		}

		content_directory = abs;
	} else {
		content_directory = current_workind_directory;
	}

	const resolvedConfig: ResolvedConfig = {
		asciidoctor: {
			safe: config.asciidoctor?.safe || defaultConfig.asciidoctor.safe,
			attributes: adocAttrs,
			extensions: config.asciidoctor?.extensions,
		},
		server: {
			port:
				serverOptions.server?.port ||
				config.server_port ||
				defaultConfig.server_port,
		},
		dirs: {
			current_working_directory: current_workind_directory,
			config_dir: dirname(configPath),
			script_dir: scriptDir,
			content_dir: content_directory,
		},
	};

	return Object.freeze(resolvedConfig);
}

function resolveAsciidoctorAttributes(
	userAttr: AsciidoctorAttributes = {},
): AsciidoctorAttributes {
	const styleDir = userAttr['stylesdir'];
	const stylesheet = userAttr['stylesheet'];

	if (!(styleDir && typeof styleDir === 'string' && stylesheet)) {
		userAttr['stylesdir'] = defaultConfig.asciidoctor.attributes.stylesdir;
		userAttr['stylesheet'] =
			defaultConfig.asciidoctor.attributes.stylesheet;
		userAttr['linkcss'] = defaultConfig.asciidoctor.attributes.linkcss;
	}

	return {
		...userAttr,
	};
}
