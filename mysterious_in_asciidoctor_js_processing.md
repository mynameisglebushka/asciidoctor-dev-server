# mysterious in asciidoctor js processing 

1. `Document.getHeader()` says return value is a string, but it is a Object
2. `Document.getCatalog()` may return list of includes in parameter BUT:
    * list collects only included .adoc files
    * file paths not include extensions `include::sub/index.adoc` => `sub/index`, but only for .adoc files because who cares, right?