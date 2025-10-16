import winston from "winston";
import morgan from 'morgan';

const LoggingFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}] ${message}`;
});

export function InitLogger() {
    (globalThis).GlobalLogger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.combine(
            winston.format.timestamp(),
            LoggingFormat
        ),
        transports: [
            new winston.transports.Console(),
        ]
    });
}

export function getLogger() {
    return (globalThis).GlobalLogger;
}

export function InitRequestLogger() {
    return morgan(
        (tokens, req, res) => {
            return JSON.stringify({
                method: tokens.method(req, res),
                url: tokens.url(req, res),
                status: tokens.status(req, res),
                userAgent: tokens['user-agent'](req, res)
            });
        },
        {
            stream: { write: (message) => getLogger().info(message.trim()) }
        }
    );
}