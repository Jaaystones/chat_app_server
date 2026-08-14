"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageRouter = void 0;
const express_1 = require("express");
const messageController = __importStar(require("../controllers/message.controller"));
const translationController = __importStar(require("../controllers/translation.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_1 = require("../middleware/validate");
const message_validation_1 = require("../validation/message.validation");
const translation_validation_1 = require("../validation/translation.validation");
exports.messageRouter = (0, express_1.Router)();
exports.messageRouter.use(auth_middleware_1.requireAuth);
exports.messageRouter.patch('/:id', (0, validate_1.validateBody)(message_validation_1.editMessageSchema), messageController.update);
exports.messageRouter.delete('/:id', messageController.remove);
exports.messageRouter.post('/:id/translate', (0, validate_1.validateBody)(translation_validation_1.translateMessageSchema), translationController.translate);
//# sourceMappingURL=message.routes.js.map