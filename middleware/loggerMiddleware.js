const morgan = require('morgan');

/**
 * HTTP request logger middleware using morgan.
 * Logs method, URL, status code, response time, and content length.
 */
const loggerMiddleware = morgan(':method :url :status :res[content-length] - :response-time ms');

module.exports = loggerMiddleware;
