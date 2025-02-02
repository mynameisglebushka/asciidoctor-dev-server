import Processor from '@asciidoctor/core';
import type { Asciidoctor } from '@asciidoctor/core';
import Kroki from 'asciidoctor-kroki';

export class AdocRenderer {
	private asciidoc: Asciidoctor;

	constructor() {
		this.asciidoc = Processor();

		Kroki.register(this.asciidoc.Extensions);
	}

	convert(filePath: string) {
		const convertedDocument = this.asciidoc.convertFile(filePath, {
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
	}
}
