const prefix = "Database Runner:";

export const log = {
  log: (...args) => console.log(prefix, ...args),
  warn: (...args) => console.warn(prefix, ...args),
  error: (...args) => console.error(prefix, ...args)
};