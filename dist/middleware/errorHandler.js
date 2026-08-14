"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const AppError_1 = require("../utils/AppError");
const logger_1 = require("../config/logger");
function notFoundHandler(req, res) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` } });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function errorHandler(err, req, res, _next) {
    if (err instanceof AppError_1.AppError) {
        if (!err.isOperational) {
            logger_1.logger.error('Non-operational AppError', { message: err.message, code: err.code });
        }
        res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
        return;
    }
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request data',
                details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
            },
        });
        return;
    }
    const error = err instanceof Error ? err : new Error('Unknown error');
    logger_1.logger.error('Unhandled error', { message: error.message, stack: error.stack, path: req.path });
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}
//# sourceMappingURL=errorHandler.js.map