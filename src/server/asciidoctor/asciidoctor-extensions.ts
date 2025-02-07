import { Extensions } from '@asciidoctor/core';

type IncludedType = 'include' | 'plantuml';

export interface IncludedFile {
	type: IncludedType;
	path: string;
}

export const findIncludedContent = function (
	register: Extensions.Registry,
	dist: IncludedFile[],
) {
	register.preprocessor(function (this: Extensions.PreprocessorDsl) {
		this.process((doc, reader) => {
			const lines = reader.readLines();
			lines.forEach((line) => {
				if (line.startsWith('plantuml::')) {
					const result = line.match(/plantuml::(.*?)\[[^\]]*\]/);
					if (result === null || result.length < 2) return;

					dist.push({
						type: 'plantuml',
						path: result[1],
					});

					return;
				}
			});
		});
	});
};
