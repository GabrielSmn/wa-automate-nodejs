import os from 'os';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Syslog } from 'winston-syslog';
import { LogToEvTransport } from './custom_transport';
const { combine, timestamp } = winston.format;
import traverse from "traverse";
import { klona } from "klona/full";
const truncateLength = 200;
let _evSet = false,
  _consoleSet = false,
  d = Date.now();

const sensitiveKeys = [
  /cookie/i,
  /sessionData/i,
  /passw(or)?d/i,
  /^pw$/,
  /^pass$/i,
  /secret/i,
  /token/i,
  /api[-._]?key/i,
];

function isSensitiveKey(keyStr) {
  if (keyStr) {
    return sensitiveKeys.some(regex => regex.test(keyStr));
  }
}

function redactObject(obj) {
  traverse(obj).forEach(function redactor() {
    if (isSensitiveKey(this.key)) {
      this.update("[REDACTED]");
    } else if(typeof this.node === 'string' && this.node.length > truncateLength) {
      this.update(truncate(this.node, truncateLength));
    }
  });
}

function redact(obj) {
  const copy = klona(obj); // Making a deep copy to prevent side effects
  redactObject(copy);

  const splat = copy[Symbol.for("splat")];
  redactObject(splat); // Specifically redact splat Symbol

  return copy;
}


function truncate(str: string, n: number) {
  return str.length > n ? str.substr(0, n - 1) + '...[TRUNCATED]...' : str;
}

const formatRedact = winston.format(redact);

const makeLogger = () =>
  winston.createLogger({
    format: combine(
      timestamp(),
      winston.format.json(),
      formatRedact(),
      winston.format.splat(),
      winston.format.simple()
    ),
    levels: winston.config.syslog.levels,
  });

export const log = makeLogger();

export const addRotateFileLogTransport = (options: any = {}) => {
  log.add(
    new DailyRotateFile({
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD-HH',
      zippedArchive: true,
      maxSize: '2m',
      maxFiles: '14d',
      ...options,
    })
  );
};

const addSysLogTransport = (options: any = {}) => {
  log.add(
    new Syslog({
      localhost: os.hostname(),
      ...options,
    })
  );
};

const enableConsoleLogger = (options: any = {}) => {
  if (_consoleSet) return;
  log.add(
    new winston.transports.Console({
      level: 'debug',
      timestamp: timestamp(),
      ...options,
    } as any)
  );
  _consoleSet = true;
};

function enableLogToEv(options: any = {}) {
  if (_evSet) return;
  log.add(
    new LogToEvTransport({
      format: winston.format.json(),
      ...options,
    })
  );
  _evSet = true;
}

export type ConfigLogTransport = {
  /**
   * The type of winston transport. At the moment only file, console, ev and syslog are supported.
   */
  type: 'syslog' | 'console' | 'file' | 'ev';
  /**
   * The options for the transport. Generally only required for syslog but you can use this to override default options for other types of transports.
   */
  options?: any;
  done?: boolean;
};

export const setupLogging = (logging: ConfigLogTransport[], sessionId: string = "session") => {
  const currentlySetup = [];
  const _logging = logging.map((l) => {
    if (l.done) return l;
    if (l.type === 'console') {
      enableConsoleLogger({
        ...(l.options || {}),
      });
    } else if (l.type === 'ev') {
      enableLogToEv({
        ...(l.options || {}),
      });
    } else if (l.type === 'file') {
      addRotateFileLogTransport({
        ...(l.options || {}),
      });
    } else if (l.type === 'syslog') {
      addSysLogTransport({
        ...(l.options || {}),
        appName: `owa-${sessionId}-${d}`
      });
    }
    currentlySetup.push(l);
    return {
      ...l,
      done: true,
    };
  });
  currentlySetup.map((l) => {
    log.info(`Set up logging for ${l.type}`, l.options);
    return l;
  });
  return _logging;
};
