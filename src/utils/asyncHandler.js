const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) =>
            next(err)
        );
    };
};

const tryCatch = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            next(error);
        }
    };
};

const handleService = async (serviceFunction, ...args) => {
    try {
        return await serviceFunction(...args);
    } catch (error) {
        throw error;
    }
};

export { asyncHandler, tryCatch, handleService };
