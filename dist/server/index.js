import Processor from '@asciidoctor/core';
import { register } from 'asciidoctor-kroki';
import { basename, resolve, dirname, parse, join, extname } from 'node:path';
import { readFileSync, readdir, existsSync, statSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import chokidar from 'chokidar';
import { createServer as createServer$1 } from 'node:http';
import mime from 'mime-types';
import { WebSocketServer, WebSocket } from 'ws';
import colors from 'picocolors';
import { cursorTo, clearScreenDown } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { cwd } from 'node:process';

function createProcessor(opts) {
    const adocOpts = opts.config.asciidoctor;
    const asciidoctor = Processor();
    function convert(file) {
        const register$1 = asciidoctor.Extensions.create();
        register(register$1);
        if (adocOpts.extensions)
            adocOpts.extensions(register$1);
        const convertedDocument = asciidoctor.convertFile(file, {
            standalone: true,
            to_file: false,
            safe: adocOpts.safe,
            attributes: adocOpts.attributes,
            extension_registry: register$1,
        });
        let result;
        if (typeof convertedDocument === 'string') {
            result = convertedDocument;
        }
        else {
            result = convertedDocument.convert();
        }
        return result;
    }
    function collectFileInfo(file) {
        function getBlockSource(dst, block) {
            if (!block)
                return;
            const path = block.getSourceLocation()?.getPath();
            if (path)
                dst.set(path, null);
            block.getBlocks()?.forEach((_block) => getBlockSource(dst, _block));
        }
        const register = asciidoctor.Extensions.create();
        const files = [];
        findIncludedContent(register, files);
        const doc = asciidoctor.loadFile(file, {
            safe: 'safe',
            parse: true,
            sourcemap: true,
            extension_registry: register,
        });
        const includes = new Map();
        getBlockSource(includes, doc);
        includes.delete(basename(file));
        includes.forEach((_, key) => {
            files.push({
                type: 'include',
                path: key,
            });
        });
        const header = doc.getHeader();
        let title = undefined;
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
    const processor = {
        convert: convert,
        collectFileInfo: collectFileInfo,
    };
    return processor;
}
function findIncludedContent(registry, dist) {
    function preprocessor_processor(doc, reader) {
        const _lines = reader.getLines();
        const _file = reader.getCursor().getFile();
        const _path = reader.getCursor().getPath();
        const _ln = reader.getCursor().getLineNumber();
        const lines = reader.read();
        const krokiRegEx = /^(?<type>d2|plantuml)::(?<path>.*?)\[[^\]]*\]/gm;
        const result = lines.matchAll(krokiRegEx);
        if (result !== null) {
            for (const match of result) {
                if (!match.groups)
                    continue;
                const filepath = match.groups.path;
                // if (filepath.match(/[{}]/)) continue
                // Если в пути файла указана переменная типа {attribute}, то на этапе
                // препроцессора с этим ничего не сделать, атрибуты оттуда не достаются
                // необходимо искать другие пути извлечения информации
                dist.push({
                    type: 'kroki_diagram',
                    path: filepath,
                });
            }
        }
        return reader.pushInclude(_lines, _file, _path, _ln);
    }
    function preprocessor() {
        this.process(preprocessor_processor);
    }
    registry.preprocessor(preprocessor);
}

function createHtmlRenderer(opts) {
    const router = opts.router;
    const scriptDir = opts.config.dirs.script_dir;
    const homeTemplate = readFileSync(resolve(scriptDir, 'public/home_page.html'), {
        encoding: 'utf-8',
    });
    const notFoundTemplate = readFileSync(resolve(scriptDir, 'public/notfound_page.html'), {
        encoding: 'utf-8',
    });
    const renderedTemplate = readFileSync(resolve(scriptDir, 'public/rendered_page.html'), {
        encoding: 'utf-8',
    });
    const builder = routerBuilder(router);
    const html = {
        home() {
            const result = '';
            return homeTemplate
                .replace(`<!--app-html-->`, result)
                .replace('<!--navigation-->', builder());
        },
        notFound(url) {
            const result = `<h1>Nothing was found on the ${url || '/'}</h1>`;
            return notFoundTemplate
                .replace(`<!--app-html-->`, result)
                .replace('<!--navigation-->', builder());
        },
        render(html) {
            const _html = new JSDOM(html, {
                contentType: 'text/html',
            });
            return renderedTemplate
                .replace(`<!--app-head-->`, _html.window.document.head.innerHTML)
                .replace('<!--navigation-->', builder())
                .replace(`<!--app-html-->`, _html.window.document.body.innerHTML);
        },
    };
    return html;
}
const routerBuilder = (router) => {
    return () => {
        let r = '';
        router.routes.forEach((v, k) => {
            r += `<div class="navigation-link"><span>${v.file}:</span><a href="${k}">${v.title || 'title not found'}</a></div>`;
        });
        return r;
    };
};

function createRouter(opts) {
    const log = opts.logger.with('router');
    const processor = opts.asciidoctor;
    const cwd = opts.config.dirs.current_working_directory;
    const path = opts.config.dirs.content_dir;
    const checkFile = (_file) => {
        if (/(^|[/\\])\../.test(_file) || _file.includes('node_modules'))
            return;
        const pp = parse(_file);
        if (pp.ext !== '.adoc')
            return;
        return {
            route: '/' + join(pp.dir, pp.name),
            file: join(pp.dir, pp.base),
            absPath: resolve(cwd, path, join(pp.dir, pp.base)),
        };
    };
    const updateInfo = (info) => {
        const { title, included_files } = processor.collectFileInfo(info.absPath);
        info.title = title;
        info.includedFiles = included_files;
    };
    const routerMap = new Map();
    function insertRoute(_file) {
        const ok = checkFile(_file);
        if (!ok) {
            return;
        }
        const { route, file, absPath } = ok;
        if (routerMap.has(route)) {
            log.debug(`file ${_file} already exist in router by ${route} path`);
            return;
        }
        const routeInfo = {
            file,
            absPath,
        };
        updateInfo(routeInfo);
        routerMap.set(route, routeInfo);
        log.debug(`file ${file} setup in router on ${route} path`);
        return {
            route: route,
            ...routeInfo,
        };
    }
    function removeRouteByFile(_file) {
        const ok = checkFile(_file);
        if (!ok)
            return false;
        const { route } = ok;
        const isRemove = routerMap.delete(route);
        const logMsg = isRemove
            ? `${_file} deleted from router with ${route} route`
            : `${_file} NOT deleted from router with ${route} route`;
        log.debug(logMsg);
        return isRemove;
    }
    function getFileByRoute(route) {
        const r = routerMap.get(route);
        return r ? r.file : undefined;
    }
    function getAbsPathByRoute(route) {
        const r = routerMap.get(route);
        return r ? r.absPath : undefined;
    }
    function getRouteByFile(file) {
        for (const [route, info] of routerMap) {
            if (info.file === file) {
                updateInfo(info);
                return {
                    route,
                    ...info,
                };
            }
        }
        return undefined;
    }
    function getRoutesByIncludedFile(file) {
        file = resolve(path, file);
        const result = [];
        routerMap.forEach((info, route) => {
            if (!info.includedFiles)
                return;
            for (const incFile of info.includedFiles) {
                const incFilePath = resolve(dirname(info.absPath), incFile.path);
                if (incFilePath === file) {
                    updateInfo(info);
                    result.push({
                        route,
                        ...info,
                    });
                    return;
                }
            }
        });
        return result.length > 0 ? result : undefined;
    }
    const router = {
        routes: routerMap,
        insertRoute,
        removeRouteByFile,
        getFileByRoute,
        getRouteByFile,
        getRoutesByIncludedFile,
        getAbsPathByRoute,
    };
    readdir(path, { recursive: true, encoding: 'utf-8' }, (err, files) => {
        if (err)
            log.error(err.message);
        else {
            files.forEach((_file) => {
                router.insertRoute(_file);
            });
        }
    });
    return router;
}

// Servers
const socketServerEvent = (event) => {
    return JSON.stringify(event);
};

function startWatcher(opts) {
    const log = opts.logger.with('watcher');
    const router = opts.router;
    const wss = opts.wss;
    const path = opts.config.dirs.content_dir;
    const watcher = chokidar.watch('.', {
        ignored: [/(^|[/\\])\../, 'node_modules'],
        cwd: path,
        ignoreInitial: true,
    });
    watcher.on('add', (path) => {
        log.debug(`file ${path} add`);
        const _route = router.insertRoute(path);
        if (!_route)
            return;
        wss.sendEventToAllConnectedClients(socketServerEvent({
            type: 'file_added',
            data: {
                route: _route.route,
                file: _route.file,
                title: _route.title,
            },
        }));
    });
    watcher.on('unlink', (path) => {
        log.debug(`file ${path} unlink`);
        if (!router.removeRouteByFile(path))
            return;
        wss.sendEventToAllConnectedClients(socketServerEvent({
            type: 'file_remove',
            data: { file: path },
        }));
    });
    watcher.on('change', (path) => {
        log.debug(`file ${path} change`);
        const _route = router.getRouteByFile(path);
        const _routes = router.getRoutesByIncludedFile(path);
        if (!_route && !_routes)
            return;
        wss.sendEventToAllConnectedClients(socketServerEvent({
            type: 'file_change',
            data: {
                route: _route?.route,
                affected_routes: _routes?.map((r) => r.route),
            },
        }));
    });
}

const CAN_LOG_REQUEST = (path) => {
    return ['.adoc', ''].includes(extname(path));
};
const logging = (logger) => {
    return (next) => {
        return (req, res) => {
            const path = req.url || '/';
            if (CAN_LOG_REQUEST(path))
                logger.info(`request: path - ${path}`);
            next(req, res);
            if (CAN_LOG_REQUEST(path))
                logger.info(`response: path - ${path}, status - ${res.statusCode}`);
        };
    };
};
const health = () => {
    return (next) => {
        return (req, res) => {
            if (req.url === '/ads-health') {
                res.writeHead(200).end();
                return;
            }
            next(req, res);
        };
    };
};
const reservedStatic = (opts) => {
    return (next) => {
        const defaultMime = 'application/octet-stream';
        const filesMap = opts.files;
        const scriptDir = opts.scriptDir;
        const configPath = opts.configDir;
        const contentPath = opts.contentDir;
        return (req, res) => {
            function writeContent(type, content) {
                res.writeHead(200, { 'content-type': type }).end(content);
            }
            function notFound(path) {
                res.writeHead(404).end(`file ${path} not found`);
            }
            let path = req.url;
            if (path.startsWith('/__ads')) {
                const relativeFilePath = path.slice(path.indexOf('/', 1) + 1);
                const ok = filesMap.get(relativeFilePath);
                if (!ok) {
                    notFound(relativeFilePath);
                    return;
                }
                const fileContent = readFileSync(join(scriptDir, relativeFilePath), {
                    encoding: 'utf-8',
                });
                const { contentType, modify } = ok;
                const content = modify ? modify(fileContent) : fileContent;
                writeContent(contentType, content);
                return;
            }
            const fileExt = extname(path);
            if (fileExt === '.adoc') {
                next(req, res);
                return;
            }
            if (!['', '.'].includes(fileExt)) {
                if (configPath !== '' && !path.includes(configPath)) {
                    path = join(contentPath, path);
                }
                if (!existsSync(path)) {
                    notFound(path);
                    return;
                }
                writeContent(mime.contentType(fileExt) || defaultMime, readFileSync(path));
                return;
            }
            next(req, res);
        };
    };
};
const home = (html) => {
    return (next) => {
        return (req, res) => {
            const url = req.url;
            if (!url) {
                res.writeHead(200, { 'content-type': 'text/html' }).end(html.home());
                return;
            }
            next(req, res);
        };
    };
};
const chain = (...xs) => {
    return (next) => {
        for (let i = xs.length - 1; i >= 0; i--) {
            const x = xs[i];
            next = x(next);
        }
        return next;
    };
};

function createServer(opts) {
    const log = opts.logger.with('server');
    const port = opts.config.server.port;
    const scriptDir = opts.config.dirs.script_dir;
    const configDir = opts.config.dirs.config_dir;
    const contentDir = opts.config.dirs.content_dir;
    const asciidoctorProcessor = opts.asciidoctor;
    const htmlRenderer = opts.html;
    const router = opts.router;
    const handler = (req, res) => {
        try {
            const url = normalizePath(req.url);
            const path = router.getAbsPathByRoute(url);
            if (!path) {
                writeReponse(htmlRenderer.notFound(url));
                return;
            }
            const convertedDocument = asciidoctorProcessor.convert(path);
            if (!convertedDocument) {
                log.error(`fail on convert document ${path}`);
                res.writeHead(500).end(`Cannot convert document ${path}`);
                return;
            }
            writeReponse(htmlRenderer.render(convertedDocument));
        }
        catch (e) {
            const error = e;
            log.error(error.message);
            res.writeHead(500).end();
        }
        function writeReponse(html) {
            res.writeHead(200, { 'content-type': 'text/html' }).end(html);
        }
    };
    const _staticFiles = new Map()
        .set('dist/client/@asciidoctor-dev-client.js', {
        contentType: 'text/javascript',
        modify: (content) => {
            return content.replace('__PORT__', JSON.stringify(port));
        },
    })
        .set('public/asciidoctor-dev-render.css', {
        contentType: 'text/css',
    })
        .set('public/asciidoctor-dev-self-page.css', {
        contentType: 'text/css',
    })
        .set('public/render-styles.css', {
        contentType: 'text/css',
    })
        .set('node_modules/@asciidoctor/core/dist/css/asciidoctor.css', {
        contentType: 'text/css',
    });
    const middlewares = chain(logging(log), health(), reservedStatic({
        files: _staticFiles,
        scriptDir,
        configDir,
        contentDir,
    }), home(htmlRenderer));
    const _server = createServer$1(middlewares(handler));
    const server = {
        listen(cb) {
            _server.listen(port, cb);
        },
        server: _server,
    };
    return server;
}
function normalizePath(path) {
    if (!path)
        return '/';
    const pp = parse(path);
    if (pp.ext === '.adoc')
        return join(pp.dir, pp.name);
    return path;
}

function createWSServer(opts) {
    const logger = opts.logger.with('websocket');
    const _wss = new WebSocketServer({ server: opts.httpServer.server });
    _wss.on('connection', connectionHandler(logger));
    const wss = {
        sendEventToAllConnectedClients(event) {
            _wss.clients.forEach((client) => {
                if (client.readyState !== WebSocket.OPEN)
                    return;
                client.send(event);
            });
        },
    };
    return wss;
}
const connectionHandler = (logger) => {
    return function (s) {
        s.on('error', (err) => logger.error(err.message));
        s.on('message', function message(data) {
            const msg = JSON.parse(data.toString());
            switch (msg.type) {
                case 'connect':
                    logger.debug(`connection on path ${msg.data.path}`);
            }
        });
    };
};

function createLogger(opts) {
    const prefix = '[ads]';
    const timeformatter = Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    });
    const format = (type, msg, opts) => {
        let colorFunc;
        if (type === 'info') {
            colorFunc = colors.cyan;
        }
        else if (type === 'debug') {
            colorFunc = colors.gray;
        }
        else if (type === 'warn') {
            colorFunc = colors.yellow;
        }
        else {
            colorFunc = colors.red;
        }
        const tag = colorFunc(colors.bold(`${colors.dim('[' + timeformatter.format(new Date()) + ']')} ${prefix} [${type.toUpperCase()}]`));
        let _stack = '';
        opts?.stack.forEach((item) => {
            _stack += colorFunc(item) + ' ';
        });
        return `${tag} ${_stack || ''}${msg}`;
    };
    const output = (type, msg, opts) => {
        const method = type === 'info' ? 'log' : type;
        console[method](format(type, msg, opts));
    };
    const logger = {
        opts: {
            debug: opts.debug,
        },
        stack: [],
        info(msg) {
            output('info', msg, {
                stack: this.stack,
            });
        },
        debug(msg) {
            if (this.opts.debug)
                output('debug', msg, {
                    stack: this.stack,
                });
        },
        warn(msg) {
            output('warn', msg, {
                stack: this.stack,
            });
        },
        error(msg) {
            output('error', msg, {
                stack: this.stack,
            });
        },
        with(val) {
            const c = {
                opts: {
                    debug: this.opts.debug,
                },
                stack: [...this.stack],
                info: this.info,
                warn: this.warn,
                debug: this.debug,
                error: this.error,
                with: this.with,
            };
            c.stack.push(val);
            return c;
        },
    };
    return logger;
}

const defaultConfig = Object.freeze({
    asciidoctor: {
        safe: 'safe',
        attributes: {
            stylesdir: '/__ads/node_modules/@asciidoctor/core/dist/css',
            stylesheet: 'asciidoctor.css',
            linkcss: true,
        },
    },
    server_port: 8081,
});
async function resolveConfig(configPath, scriptDir, serverOptions) {
    let configModule = { default: {} };
    if (configPath !== '') {
        configModule = await import(configPath);
    }
    const config = configModule.default ?? {};
    const adocAttrs = resolveAsciidoctorAttributes(config.asciidoctor?.attributes);
    const current_workind_directory = process.cwd();
    let content_directory = '';
    if (serverOptions.workingDirectory) {
        const abs = resolve(current_workind_directory, serverOptions.workingDirectory);
        const stat = statSync(abs, {
            throwIfNoEntry: false,
        });
        if (!stat) {
            return `no such directory -> ${serverOptions.workingDirectory}`;
        }
        if (!stat.isDirectory()) {
            return `path ${serverOptions.workingDirectory} is not a directory`;
        }
        content_directory = abs;
    }
    else {
        content_directory = current_workind_directory;
    }
    const resolvedConfig = {
        asciidoctor: {
            safe: config.asciidoctor?.safe || defaultConfig.asciidoctor.safe,
            attributes: adocAttrs,
            extensions: config.asciidoctor?.extensions,
        },
        server: {
            port: serverOptions.server?.port ||
                config.server_port ||
                defaultConfig.server_port,
        },
        dirs: {
            current_working_directory: current_workind_directory,
            config_dir: dirname(configPath),
            script_dir: scriptDir,
            content_dir: content_directory,
        },
    };
    return Object.freeze(resolvedConfig);
}
function resolveAsciidoctorAttributes(userAttr = {}) {
    const styleDir = userAttr['stylesdir'];
    const stylesheet = userAttr['stylesheet'];
    if (!(styleDir && typeof styleDir === 'string' && stylesheet)) {
        userAttr['stylesdir'] = defaultConfig.asciidoctor.attributes.stylesdir;
        userAttr['stylesheet'] =
            defaultConfig.asciidoctor.attributes.stylesheet;
        userAttr['linkcss'] = defaultConfig.asciidoctor.attributes.linkcss;
    }
    return {
        ...userAttr,
    };
}

const configFiles = ['.ads.config.js', '.ads.config.cjs', '.ads.config.mjs'];
async function createDevServer(options = {}) {
    const logger = createLogger({ debug: options.debug || false });
    let finalConfig = '';
    if (options.configPath === undefined) {
        const configDirs = [cwd(), join(homedir(), '.ads/')];
        for (const i in configDirs) {
            for (const j in configFiles) {
                const maybeConfig = join(configDirs[i], configFiles[j]);
                if (existsSync(maybeConfig)) {
                    finalConfig = maybeConfig;
                    break;
                }
            }
        }
        logger.debug(`${finalConfig === '' ? 'no config files on default paths' : `use config file on "${finalConfig}"`}`);
    }
    else if (options.configPath !== '') {
        if (!existsSync(options.configPath)) {
            logger.error(`no config on "${options.configPath}"`);
            return;
        }
        finalConfig = options.configPath;
        logger.debug(`run with ${finalConfig} config file`);
    }
    else {
        logger.debug('run on default settings');
    }
    const script_directory = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const config = await resolveConfig(finalConfig, script_directory, options);
    if (typeof config === 'string') {
        logger.error(config);
        return;
    }
    const asciidoctor = createProcessor({ config });
    const router = createRouter({
        logger,
        config,
        asciidoctor,
    });
    const html = createHtmlRenderer({ router, config });
    const devServer = createServer({
        logger,
        config,
        asciidoctor,
        html,
        router,
    });
    const wss = createWSServer({ logger, httpServer: devServer });
    startWatcher({ logger, config, router, wss });
    devServer.listen(() => {
        const repeatCount = process.stdout.rows - 2;
        const blank = repeatCount > 0 ? '\n'.repeat(repeatCount) : '';
        console.log(blank);
        cursorTo(process.stdout, 0, 0);
        clearScreenDown(process.stdout);
        console.log(
        // prettier-ignore
        '┏━━━┓━━┏┓━━━━━━━━┏━━━┓━━━━━━━━┏━━━┓━━━━━━━━━━━━━━━━━━' + '\n' +
            '┃┏━┓┃━━┃┃━━━━━━━━┗┓┏┓┃━━━━━━━━┃┏━┓┃━━━━━━━━━━━━━━━━━━' + '\n' +
            '┃┃━┃┃┏━┛┃┏━━┓┏━━┓━┃┃┃┃┏━━┓┏┓┏┓┃┗━━┓┏━━┓┏━┓┏┓┏┓┏━━┓┏━┓' + '\n' +
            '┃┗━┛┃┃┏┓┃┃┏┓┃┃┏━┛━┃┃┃┃┃┏┓┃┃┗┛┃┗━━┓┃┃┏┓┃┃┏┛┃┗┛┃┃┏┓┃┃┏┛' + '\n' +
            '┃┏━┓┃┃┗┛┃┃┗┛┃┃┗━┓┏┛┗┛┃┃┃━┫┗┓┏┛┃┗━┛┃┃┃━┫┃┃━┗┓┏┛┃┃━┫┃┃━' + '\n' +
            '┗┛━┗┛┗━━┛┗━━┛┗━━┛┗━━━┛┗━━┛━┗┛━┗━━━┛┗━━┛┗┛━━┗┛━┗━━┛┗┛━' + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n');
        console.log(`AsciiDoctor Dev Server start on:\n`);
        console.log(`-> Local - http://localhost:${config.server.port}`);
    });
}

export { createDevServer };
//# sourceMappingURL=index.js.map
