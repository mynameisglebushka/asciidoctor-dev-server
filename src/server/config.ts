import { isAbsolute } from 'node:path';

interface AsciidoctorAttributes {
	[key: string]: unknown;
}

interface AsciiDoctorDevServerConfig {
	asciidoctor?: {
		safe?: string | number;
		attributes?: AsciidoctorAttributes;
	};
}

interface ResolvedConfig {
	asciidoctor: {
		safe: string | number;
		attributes: AsciidoctorAttributes;
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
} satisfies AsciiDoctorDevServerConfig);

export async function resolveConfig(
	path: string,
): Promise<ResolvedConfig | undefined> {
	const configModule: { default: AsciiDoctorDevServerConfig } = await import(
		path
	);

	if (!configModule) {
		return;
	}

	if (!configModule.default) {
		return;
	}

	const config = configModule.default;

	const adocAttrs = resolveAsciidoctorAttributes(
		path,
		config.asciidoctor?.attributes,
	);

	const resolvedConfig: ResolvedConfig = {
		asciidoctor: {
			safe: config.asciidoctor?.safe || defaultConfig.asciidoctor.safe,
			attributes: adocAttrs,
		},
	};

	return resolvedConfig;
}

// Резолвить пути в конфигах не нужно
// На этапе middleware необходимо предусмотреть логику, что
// Если пришел запрос на какой-то файл, и нет прификса __ads, значит путь указан через конфиг
// И резолвить путь относительно директории конфига
// Перед тем как делать resolve или join надо проверять, что в пути уже не содержитсья путь до конфига
// Потому что при запросах http path всегда будет abs
// Но ряд атрибутов стоит переопределить, если они не указаны
function resolveAsciidoctorAttributes(
	configPath: string,
	userAttr: AsciidoctorAttributes = {},
): AsciidoctorAttributes {
	const styleDir = userAttr['stylesdir'];
	const stylesheet = userAttr['stylesheet'];

	if (styleDir && typeof styleDir === 'string' && stylesheet) {
		userAttr['stylesdir'] = isAbsolute(styleDir)
			? styleDir
			: configPath + styleDir;
	} else {
		userAttr['stylesdir'] = defaultConfig.asciidoctor.attributes.stylesdir;
		userAttr['stylesheet'] =
			defaultConfig.asciidoctor.attributes.stylesheet;
		userAttr['linkcss'] = defaultConfig.asciidoctor.attributes.linkcss;
	}

	return {
		...userAttr,
	};
}
