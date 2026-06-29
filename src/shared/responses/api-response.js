import { HttpStatus } from "../constants/index.js";

class ApiResponse {
    constructor(statusCode, data, message = "Success", meta = null) {
        this.success = statusCode < 400;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.timestamp = new Date().toISOString();
        if (meta) this.meta = meta;
    }

    static success(data, message = "Success") {
        return new ApiResponse(HttpStatus.OK, data, message);
    }

    static created(data, message = "Resource created successfully") {
        return new ApiResponse(HttpStatus.CREATED, data, message);
    }

    static noContent(message = "No content") {
        return new ApiResponse(HttpStatus.NO_CONTENT, null, message);
    }

    static paginated(data, pagination, message = "Success") {
        return new ApiResponse(HttpStatus.OK, data, message, { pagination });
    }

    toJSON() {
        const response = {
            success: this.success,
            statusCode: this.statusCode,
            message: this.message,
            data: this.data,
            timestamp: this.timestamp,
        };
        if (this.meta) response.meta = this.meta;
        return response;
    }
}

class PaginationBuilder {
    constructor(page, limit, totalCount) {
        this.page = Math.max(1, parseInt(page) || 1);
        this.limit = Math.max(1, Math.min(100, parseInt(limit) || 10));
        this.totalCount = Math.max(0, parseInt(totalCount) || 0);
    }

    build() {
        const totalPages = Math.ceil(this.totalCount / this.limit);
        return {
            currentPage: this.page,
            totalPages,
            pageSize: this.limit,
            totalCount: this.totalCount,
            hasNextPage: this.page < totalPages,
            hasPreviousPage: this.page > 1,
        };
    }

    setPage(page) {
        this.page = Math.max(1, parseInt(page) || 1);
        return this;
    }

    setLimit(limit) {
        this.limit = Math.max(1, Math.min(100, parseInt(limit) || 10));
        return this;
    }

    setTotalDocs(totalCount) {
        this.totalCount = Math.max(0, parseInt(totalCount) || 0);
        return this;
    }

    getSkip() {
        return (this.page - 1) * this.limit;
    }

    getLimit() {
        return this.limit;
    }
}

export { ApiResponse, PaginationBuilder };
