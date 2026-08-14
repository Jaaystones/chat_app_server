"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    isOperational;
    code;
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message, code = 'BAD_REQUEST') {
        return new AppError(message, 400, code);
    }
    static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
        return new AppError(message, 401, code);
    }
    static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
        return new AppError(message, 403, code);
    }
    static notFound(message = 'Not found', code = 'NOT_FOUND') {
        return new AppError(message, 404, code);
    }
    static conflict(message, code = 'CONFLICT') {
        return new AppError(message, 409, code);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=AppError.js.map