import Asciidoctor from "asciidoctor";
import type { Asciidoctor as TAsciidoctor } from "asciidoctor";

export class AdocRenderer {
	private asciidoc: TAsciidoctor;

	constructor() {
		this.asciidoc = Asciidoctor();
	}

	convert(filePath: string) {
		const convertedDocument = this.asciidoc.convertFile(filePath, {
			standalone: true,
			to_file: false,
			safe: "safe",
		});

		let result: string;

		if (typeof convertedDocument === "string") {
			result = convertedDocument;
		} else {
			result = convertedDocument.convert();
		}

		return result;
	}
}
