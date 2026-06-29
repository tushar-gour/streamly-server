// @ts-nocheck
import { BadRequestError } from "../errors/api-error.js";

class ObjectIdValidator {
    static isValid(id) {
        return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);
    }

    static ensureValid(id, fieldName = "ID") {
        if (!ObjectIdValidator.isValid(id?.toString())) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }
}

export { ObjectIdValidator };
