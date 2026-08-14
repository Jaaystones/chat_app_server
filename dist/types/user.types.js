"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = toPublicUser;
function toPublicUser(user) {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
}
//# sourceMappingURL=user.types.js.map