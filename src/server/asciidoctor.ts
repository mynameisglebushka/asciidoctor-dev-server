import Processor from '@asciidoctor/core';
import Kroki from 'asciidoctor-kroki';

export interface AsciidoctorProcessor {
	convert(filePath: string): string;
}

// interface AsciidoctorProcessorOptions {}

export function createProcessor(): AsciidoctorProcessor {
	const asciidoctor = Processor();
	Kroki.register(asciidoctor.Extensions);

	const processor: AsciidoctorProcessor = {
		convert(filePath) {
			const convertedDocument = asciidoctor.convertFile(filePath, {
				standalone: true,
				to_file: false,
				safe: 'safe',
				attributes: {
					stylesdir: '/public',
					stylesheet: '@render-styles',
					linkcss: true,
				},
			});

			let result: string;

			if (typeof convertedDocument === 'string') {
				result = convertedDocument;
			} else {
				result = convertedDocument.convert();
			}

			return result;
		},
	};

	return processor;
}
