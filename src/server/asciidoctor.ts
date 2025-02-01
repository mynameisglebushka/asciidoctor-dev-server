import Processor from '@asciidoctor/core';
import type { Asciidoctor, Extensions } from '@asciidoctor/core';
import Kroki from 'asciidoctor-kroki';

export class AdocRenderer {
	private asciidoc: Asciidoctor;
	private register: Extensions.Registry;

	constructor() {
		this.asciidoc = Processor();
		this.register = this.asciidoc.Extensions.create();

		Kroki.register(this.register);
	}

	convert(filePath: string) {
		const convertedDocument = this.asciidoc.convertFile(filePath, {
			standalone: true,
			to_file: false,
			safe: 'safe',
			extension_registry: this.register,
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
