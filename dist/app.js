"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const health_routes_1 = require("./routes/health.routes");
const auth_routes_1 = require("./routes/auth.routes");
const user_routes_1 = require("./routes/user.routes");
const conversation_routes_1 = require("./routes/conversation.routes");
const message_routes_1 = require("./routes/message.routes");
const errorHandler_1 = require("./middleware/errorHandler");
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: env_1.env.CORS_ORIGIN,
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use((0, cookie_parser_1.default)());
    app.use('/health', health_routes_1.healthRouter);
    app.use('/api/auth', auth_routes_1.authRouter);
    app.use('/api/users', user_routes_1.userRouter);
    app.use('/api/conversations', conversation_routes_1.conversationRouter);
    app.use('/api/messages', message_routes_1.messageRouter);
    app.use(errorHandler_1.notFoundHandler);
    app.use(errorHandler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map