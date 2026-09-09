const { createLogger, format, transports } = require('winston');

const environment = process.env.NODE_ENV || 'development';
const isDevelopment = environment === 'development' || environment === 'local';

// 운영 로그는 로그 수집 도구가 필드별로 검색할 수 있도록 JSON으로 출력한다.
const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  format.json(),
);

// 로컬 로그는 개발자가 터미널에서 빠르게 읽을 수 있도록 한 줄과 색상으로 표현한다.
const consoleFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf(({ timestamp, level, message, stack, service: _service, ...metadata }) => {
    const details = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} [${level}] ${stack || message}${details}`;
  }),
);

/**
 * 애플리케이션 공통 로거.
 * 로그는 파일이 아닌 표준 출력으로 전달하며 Docker 또는 운영 플랫폼이 수집과 보관을 담당한다.
 */
const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: isDevelopment ? consoleFormat : jsonFormat,
  defaultMeta: { service: 'food-nutrition-api', environment },
  transports: [new transports.Console()],
});

module.exports = logger;
