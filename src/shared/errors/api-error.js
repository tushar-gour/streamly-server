import { HttpStatus } from "../constants/index.js";
import { appConfig } from "../../config/env.js";

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.success = false;
        this.errors = errors;
        this.data = null;
        this.timestamp = new Date().toISOString();
        this.isOperational = true;

        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }

        Object.setPrototypeOf(this, new.target.prototype);
    }

    toJSON() {
        return {
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            errors: this.errors,
            timestamp: this.timestamp,
            ...(appConfig.nodeEnv === "development" && {
                stack: this.stack,
            }),
        };
    }
}

class BadRequestError extends ApiError {
    constructor(message = "Bad request", errors = []) {
        super(HttpStatus.BAD_REQUEST, message, errors);
        this.name = "BadRequestError";
    }
}

class ValidationError extends ApiError {
    constructor(errors = [], message = "Validation failed") {
        super(HttpStatus.BAD_REQUEST, message, errors);
        this.name = "ValidationError";
    }
}

class UnauthorizedError extends ApiError {
    constructor(message = "Unauthorized access") {
        super(HttpStatus.UNAUTHORIZED, message);
        this.name = "UnauthorizedError";
    }
}

class ForbiddenError extends ApiError {
    constructor(message = "Access forbidden") {
        super(HttpStatus.FORBIDDEN, message);
        this.name = "ForbiddenError";
    }
}

class NotFoundError extends ApiError {
    constructor(resource = "Resource", identifier = null) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;
        super(HttpStatus.NOT_FOUND, message);
        this.name = "NotFoundError";
        this.resource = resource;
    }
}

class ConflictError extends ApiError {
    constructor(message = "Resource conflict") {
        super(HttpStatus.CONFLICT, message);
        this.name = "ConflictError";
    }
}

class InternalServerError extends ApiError {
    constructor(message = "Internal server error") {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
        this.name = "InternalServerError";
        this.isOperational = false;
    }
}

class DatabaseError extends ApiError {
    constructor(message = "Database operation failed") {
        super(HttpStatus.INTERNAL_SERVER_ERROR, message);
        this.name = "DatabaseError";
        this.isOperational = false;
    }
}

export {
    ApiError,
    BadRequestError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    InternalServerError,
    DatabaseError,
};
