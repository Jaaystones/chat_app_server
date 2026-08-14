"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
function validateBody(schema) {
    return (req, _res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            req.validatedQuery = schema.parse(req.query);
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=validate.js.map