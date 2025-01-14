#!/usr/bin/env node

import { createDevServer } from '../dist/server/index.js';

process.title = 'asciidoctor-dev-server';

createDevServer();
