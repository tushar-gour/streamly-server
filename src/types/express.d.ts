import type { Logger } from "pino";

export type AuthenticatedRequestUser = {
    _id: string;
    id?: string;
    username?: string;
    email?: string;
    fullName?: string;
};

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedRequestUser;
            requestId?: string;
            correlationId?: string;
            log?: Logger;
        }
    }
}

export {};
