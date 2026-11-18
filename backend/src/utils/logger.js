// Tiny logger. Use this instead of console.log so output looks the same everywhere.
const stamp = () => new Date().toISOString();

const logger = {
  info: (...args) => console.log(stamp(), "INFO ", ...args),
  warn: (...args) => console.warn(stamp(), "WARN ", ...args),
  error: (...args) => console.error(stamp(), "ERROR", ...args),
};

export default logger;
