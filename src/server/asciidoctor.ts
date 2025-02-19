import Processor, {
	AbstractBlock,
	Document,
	Extensions,
	Reader,
} from '@asciidoctor/core';
import { register as registerKroki } from 'asciidoctor-kroki';
import { ResolvedConfig } from './config';
import { basename } from 'node:path';

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
		function getBlockSource(dst: Map<string, null>, block: AbstractBlock) {
			if (!block) return;

			const path = block.getSourceLocation()?.getPath();
			if (path) dst.set(path, null);

			block.getBlocks()?.forEach((_block) => getBlockSource(dst, _block));
		}

		const register = asciidoctor.Extensions.create();

		const files: IncludedFile[] = [];

		findIncludedContent(register, files);

		const doc = asciidoctor.loadFile(file, {
			safe: 'safe',
			sourcemap: true,
			extension_registry: register,
			catalog_assets: true,
		});

		const includes = new Map<string, null>();

		getBlockSource(includes, doc);

		includes.delete(basename(file));

		includes.forEach((_, key) => {
			files.push({
				type: 'include',
				path: key,
			});
		});

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
		// Если диаграмма подключена в файле под include директивой, то в таком формате ее не найти
		// Необходимо делать readLine() чтобы reader спроцессил строку и добавил контент подключенного файла
		// скорее всего надо сделать readLines() и работать с полным массивом строк сразу
		// но пока непонятно, как запихнуть это обратно в работу процессора
		// BUG!
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
