import colors from 'picocolors';
import { Formatter } from 'picocolors/types';

type LogType = 'info' | 'debug' | 'warn' | 'error';
type ColorFunc = (fmt: Formatter) => string;
type LogItem = string | ColorFunc;

export interface Logger {
	readonly opts: {
		debug: boolean;
	};
	readonly stack: StackItem[];
	info(...msg: LogItem[]): void;
	debug(...msg: LogItem[]): void;
	warn(...msg: LogItem[]): void;
	error(...msg: LogItem[]): void;
	with(...vals: LogItem[]): Logger;
}

interface LoggerOptions {
	debug: boolean;
}

interface LogOptions {
	stack: StackItem[];
}

type StackItem = LogItem;

export function createLogger(opts: LoggerOptions) {
	const prefix = '[ads]';
	const timeformatter = Intl.DateTimeFormat(undefined, {
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric',
	});

	const format = (
		type: LogType,
		opts?: LogOptions,
		...msg: LogItem[]
	): string => {
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

		const _stack: string[] = [];

		opts?.stack.forEach((item) => {
			if (typeof item === 'string') {
				_stack.push(item);
			} else {
				_stack.push(item(colorFunc));
			}
		});

		const _msg: string[] = [];

		msg.forEach((m: string | ColorFunc) => {
			if (typeof m === 'string') {
				_msg.push(m);
			} else {
				_msg.push(m(colorFunc));
			}
		});

		return `${tag} ${_stack ? _stack.join(' ') + ' ' : ''}${_msg.join(' ')}`;
	};

	const output = (type: LogType, opts?: LogOptions, ...msg: LogItem[]) => {
		const method = type === 'info' ? 'log' : type;
		console[method](format(type, opts, ...msg));
	};

	const logger: Logger = {
		opts: {
			debug: opts.debug,
		},
		stack: [],
		info(this: Logger, ...msg) {
			output(
				'info',
				{
					stack: this.stack,
				},
				...msg,
			);
		},
		debug(this: Logger, ...msg) {
			if (this.opts.debug)
				output(
					'debug',
					{
						stack: this.stack,
					},
					...msg,
				);
		},
		warn(this: Logger, ...msg) {
			output(
				'warn',
				{
					stack: this.stack,
				},
				...msg,
			);
		},
		error(this: Logger, ...msg) {
			output(
				'error',
				{
					stack: this.stack,
				},
				...msg,
			);
		},
		with(this: Logger, ...vals) {
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

			c.stack.push(...vals);

			return c;
		},
	};

	return logger;
}

export const cf = (text: string): ColorFunc => {
	return (fmt: Formatter) => {
		return fmt(text);
	};
};
