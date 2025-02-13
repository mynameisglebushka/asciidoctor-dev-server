import Processor, { Extensions } from '@asciidoctor/core';
import { Reader } from '@asciidoctor/core';
import { Document } from '@asciidoctor/core';
import { register as registerKroki } from 'asciidoctor-kroki';
import { ResolvedConfig } from './config';

interface FileInfo {
	title?: string;
	included_files?: IncludedFile[];
}

type IncludedType = 'include' | 'plantuml';

export interface IncludedFile {
	type: IncludedType;
	path: string;
}

export interface AsciidoctorProcessor {
	convert(file: string): string;
	collectFileInfo(file: string): FileInfo;
}

interface AsciidoctorProcessorOptions {
	config: ResolvedConfig;
}

export function createProcessor(
	opts: AsciidoctorProcessorOptions,
): AsciidoctorProcessor {
	const adocOpts = opts.config.asciidoctor;
	const asciidoctor = Processor();

	function convert(file: string): string {
		const register = asciidoctor.Extensions.create();

		registerKroki(register);

		if (adocOpts.extensions) adocOpts.extensions(register);

		const convertedDocument = asciidoctor.convertFile(file, {
			standalone: true,
			to_file: false,
			safe: adocOpts.safe,
			attributes: adocOpts.attributes,
			extension_registry: register,
		});

		let result: string;

		if (typeof convertedDocument === 'string') {
			result = convertedDocument;
		} else {
			result = convertedDocument.convert();
		}

		return result;
	}

	function collectFileInfo(file: string): FileInfo {
		const register = asciidoctor.Extensions.create();

		const files: IncludedFile[] = [];

		findIncludedContent(register, files);

		const doc = asciidoctor.loadFile(file, {
			safe: 'safe',
			sourcemap: true,
			extension_registry: register,
			catalog_assets: true,
		});

		interface CatalogWrapper {
			includes: {
				$$keys: string[];
			};
		}

		const catalog = doc.getCatalog() as CatalogWrapper;

		const includes = catalog.includes.$$keys;

		if (includes) {
			for (const idx in includes) {
				files.push({
					type: 'include',
					path: includes[idx],
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
	}

	const processor: AsciidoctorProcessor = {
		convert: convert,
		collectFileInfo: collectFileInfo,
	};

	return processor;
}

function findIncludedContent(
	registry: Extensions.Registry,
	dist: IncludedFile[],
) {
	function preprocessor_processor(
		this: Extensions.Preprocessor,
		doc: Document,
		reader: Reader,
	) {
		const lines = reader.getLines();
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith('plantuml::')) {
				const result = lines[i].match(/plantuml::(.*?)\[[^\]]*\]/);
				if (result === null || result.length < 2) return;

				dist.push({
					type: 'plantuml',
					path: result[1],
				});

				return;
			}
		}
		return reader;
	}

	function preprocessor(this: Extensions.PreprocessorDsl) {
		this.process(preprocessor_processor);
	}

	registry.preprocessor(preprocessor);
}
