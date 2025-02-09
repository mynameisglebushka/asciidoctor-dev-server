import Processor from '@asciidoctor/core';
import { register as registerKroki } from 'asciidoctor-kroki';
import {
	findIncludedContent,
	IncludedFile,
} from './asciidoctor/asciidoctor-extensions';

interface FileInfo {
	title?: string;
	included_files?: IncludedFile[];
}

export interface AsciidoctorProcessor {
	convert(filePath: string): string;
	load(filePath: string): FileInfo;
}

// interface AsciidoctorProcessorOptions {}

export function createProcessor(): AsciidoctorProcessor {
	const asciidoctor = Processor();

	const processor: AsciidoctorProcessor = {
		convert(filePath) {
			const register = asciidoctor.Extensions.create();

			registerKroki(register);

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

		load(filePath: string): FileInfo {
			const register = asciidoctor.Extensions.create();

			const files: IncludedFile[] = [];

			findIncludedContent(register, files);

			const doc = asciidoctor.loadFile(filePath, {
				safe: 'safe',
				sourcemap: true,
				extension_registry: register,
			});

			interface CatalogWrapper {
				includes: {
					$$keys: string[];
				};
			}

			const catalog = doc.getCatalog() as CatalogWrapper;

			const includes = catalog.includes.$$keys;

			if (includes) {
				for (const include in includes) {
					files.push({
						type: 'include',
						path: include,
					});
				}
			}

			// For some reasons Asciidoctor.Document.getHeader() API says that return value is string, but for real is object
			interface HeaderWrapper {
				title?: string;
			}

			const header = doc.getHeader() as HeaderWrapper;

			let title: string | undefined = undefined;
			if (header) {
				if (header.title) {
					title = header.title;
				}
			}

			return {
				title: title,
				included_files: files.length > 0 ? files : undefined,
			};
		},
	};

	return processor;
}
