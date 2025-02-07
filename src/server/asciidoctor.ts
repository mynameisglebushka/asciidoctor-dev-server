import Processor from '@asciidoctor/core';
import Kroki from 'asciidoctor-kroki';
import {
	findIncludedContent,
	IncludedFile,
} from './asciidoctor/asciidoctor-extensions';

export interface AsciidoctorProcessor {
	convert(filePath: string): string;
	load(filePath: string): void;
}

// interface AsciidoctorProcessorOptions {}

export function createProcessor(): AsciidoctorProcessor {
	const asciidoctor = Processor();

	const processor: AsciidoctorProcessor = {
		convert(filePath) {
			const register = asciidoctor.Extensions.create();

			Kroki.register(register);

			const convertedDocument = asciidoctor.convertFile(filePath, {
				standalone: true,
				to_file: false,
				safe: 'safe',
				attributes: {
					stylesdir: '/public',
					stylesheet: '@render-styles',
					linkcss: true,
				},
				extension_registry: register,
			});

			let result: string;

			if (typeof convertedDocument === 'string') {
				result = convertedDocument;
			} else {
				result = convertedDocument.convert();
			}

			return result;
		},

		load(filePath: string) {
			const register = asciidoctor.Extensions.create();

			const files: IncludedFile[] = [];

			findIncludedContent(register, files);

			const doc = asciidoctor.loadFile(filePath, {
				safe: 'safe',
				sourcemap: true,
				extension_registry: register,
			});

			const catalog = doc.getCatalog();

			const includes = catalog['includes'].$$keys;

			if (includes) {
				for (const include in includes) {
					files.push({
						type: 'include',
						path: include,
					});
				}
			}

			console.log(files);
		},
	};

	return processor;
}
