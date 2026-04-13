import { log } from 'apify';

export interface LogData {
    [key: string]: any;
}

export interface Logger {
    info(message: string, data?: LogData): void;
    error(message: string, error: any): void;
    debug(message: string, data?: LogData): void;
    warn(message: string, data?: LogData): void;
}

export class AppLogger implements Logger {
    private context: string;

    constructor(context: string) {
        this.context = context;
    }

    private formatMessage(level: string, message: string, data?: LogData) {
        return {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            ...data && { data }
        };
    }

    info(message: string, data?: LogData): void {
        log.info(this.context, this.formatMessage('info', message, data));
    }

    error(message: string, error: any): void {
        const errorData = {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error.cause && { cause: error.cause })
        };

        log.error(this.context, this.formatMessage('error', message, { error: errorData }));
    }

    debug(message: string, data?: LogData): void {
        log.debug(this.context, this.formatMessage('debug', message, data));
    }

    warn(message: string, data?: LogData): void {
        log.warning(this.context, this.formatMessage('warn', message, data));
    }
}

// Create a factory function for easy logger creation
export function createLogger(context: string): Logger {
    return new AppLogger(context);
}
