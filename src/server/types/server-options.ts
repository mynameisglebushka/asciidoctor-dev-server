export interface AsciiDoctorDevServerOptions {
	configPath?: string;
	debug?: boolean;
	workingDirectory?: string;
	server?: {
		port?: number;
	};
}
