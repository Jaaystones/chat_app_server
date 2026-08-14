// Populated by requireAuth after verifying the access token.
declare namespace Express {
  export interface Request {
    userId?: string;
    // Populated by validateQuery — kept separate from `query` since Express 4's
    // ParsedQs type doesn't accept arbitrary zod-parsed shapes.
    validatedQuery?: unknown;
  }
}
