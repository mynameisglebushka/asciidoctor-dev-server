import colors from 'picocolors';
import { Formatter } from 'picocolors/types';

type LogType = 'info' | 'debug' | 'warn' | 'error';

export interface Logger {
	readonly opts: {
		debug: boolean;
	};
	readonly stack: StackItem[];
	info(msg: string): void;
	debug(msg: string): void;
	warn(msg: string): void;
	error(msg: string): void;
	with(val: StackItem): Logger;
}

interface LoggerOptions {
	debug: boolean;
}

interface LogOptions {
	stack: StackItem[];
}

type StackItem = string;

export function createLogger(opts: LoggerOptions) {
	const prefix = '[ads]';
	const timeformatter = Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
	});

	const format = (type: LogType, msg: string, opts?: LogOptions): string => {
		let colorFunc: Formatter;

		if (type === 'info') {
			colorFunc = colors.cyan;
		} else if (type === 'debug') {
			colorFunc = colors.gray;
		} else if (type === 'warn') {
			colorFunc = colors.yellow;
		} else {
			colorFunc = colors.red;
		}

		const tag = colorFunc(
			colors.bold(
				`${colors.dim('[' + timeformatter.format(new Date()) + ']')} ${prefix} [${type.toUpperCase()}]`,
			),
		);

		let _stack = '';

		opts?.stack.forEach((item) => {
			_stack += colorFunc(item) + ' ';
		});

		return `${tag} ${_stack || ''}${msg}`;
	};

	const output = (type: LogType, msg: string, opts?: LogOptions) => {
		const method = type === 'info' ? 'log' : type;
		console[method](format(type, msg, opts));
	};

	const logger: Logger = {
		opts: {
			debug: opts.debug,
		},
		stack: [],
		info(this: Logger, msg) {
			output('info', msg, {
				stack: this.stack,
			});
		},
		debug(this: Logger, msg) {
			if (this.opts.debug)
				output('debug', msg, {
					stack: this.stack,
				});
		},
		warn(this: Logger, msg) {
			output('warn', msg, {
				stack: this.stack,
			});
		},
		error(this: Logger, msg) {
			output('error', msg, {
				stack: this.stack,
			});
		},
		with(this: Logger, val) {
			const c: Logger = {
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
