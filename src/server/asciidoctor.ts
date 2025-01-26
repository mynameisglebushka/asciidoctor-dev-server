import Processor from 'asciidoctor';
import type { Asciidoctor } from 'asciidoctor';

export class AdocRenderer {
	private asciidoc: Asciidoctor;

	constructor() {
		this.asciidoc = Processor();
	}

	convert(filePath: string) {
		const convertedDocument = this.asciidoc.convertFile(filePath, {
			standalone: true,
			to_file: false,
			safe: 'safe',
		});

		let result: string;

		if (typeof convertedDocument === 'string') {
			result = convertedDocument;
		} else {
			result = convertedDocument.convert();
		}

		return result;
	}
}
