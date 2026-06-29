const idSchema = {
    type: "string",
    pattern: "^[0-9a-fA-F]{24}$",
    example: "0123456789abcdef01234567",
};

const timestampSchema = {
    type: "string",
    format: "date-time",
};

const paginationParameters = [
    {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
    },
    {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
];

const videoListParameters = [
    ...paginationParameters,
    {
        name: "query",
        in: "query",
        schema: { type: "string" },
        description: "Search text applied to video list.",
    },
    {
        name: "sortBy",
        in: "query",
        schema: { type: "string", default: "createdAt" },
    },
    {
        name: "sortType",
        in: "query",
        schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
    },
    {
        name: "userId",
        in: "query",
        schema: idSchema,
    },
];

const idParameter = (name, description) => ({
    name,
    in: "path",
    required: true,
    description,
    schema: idSchema,
});

const usernameParameter = {
    name: "username",
    in: "path",
    required: true,
    schema: { type: "string" },
};

const standardErrors = {
    400: { $ref: "#/components/responses/BadRequest" },
    401: { $ref: "#/components/responses/Unauthorized" },
    403: { $ref: "#/components/responses/Forbidden" },
    404: { $ref: "#/components/responses/NotFound" },
    409: { $ref: "#/components/responses/Conflict" },
    413: { $ref: "#/components/responses/PayloadTooLarge" },
    429: { $ref: "#/components/responses/RateLimited" },
    500: { $ref: "#/components/responses/InternalServerError" },
};

const jsonContent = (schema) => ({
    "application/json": {
        schema,
    },
});

const multipartContent = (schema) => ({
    "multipart/form-data": {
        schema,
    },
});

const successResponse = (description, dataSchema) => ({
    description,
    content: jsonContent({
        allOf: [
            { $ref: "#/components/schemas/ApiResponse" },
            {
                type: "object",
                properties: {
                    data: dataSchema,
                },
            },
        ],
    }),
});

const paginatedResponse = (description, itemSchema) => ({
    description,
    content: jsonContent({
        allOf: [
            { $ref: "#/components/schemas/ApiResponse" },
            {
                type: "object",
                properties: {
                    data: {
                        type: "array",
                        items: itemSchema,
                    },
                    meta: {
                        type: "object",
                        properties: {
                            pagination: {
                                $ref: "#/components/schemas/PaginationMeta",
                            },
                        },
                    },
                },
            },
        ],
    }),
});

const emptySuccessResponse = successResponse("Success response.", {
    type: "object",
});

const components = {
    securitySchemes: {
        bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT access token.",
        },
        accessTokenCookie: {
            type: "apiKey",
            in: "cookie",
            name: "accessToken",
            description: "HttpOnly access token cookie.",
        },
        refreshTokenCookie: {
            type: "apiKey",
            in: "cookie",
            name: "refreshToken",
            description: "HttpOnly refresh token cookie.",
        },
    },
    schemas: {
        ApiResponse: {
            type: "object",
            required: ["success", "statusCode", "message", "data", "timestamp"],
            properties: {
                success: { type: "boolean" },
                statusCode: { type: "integer" },
                message: { type: "string" },
                data: {},
                timestamp: timestampSchema,
                meta: { type: "object" },
            },
        },
        ApiError: {
            type: "object",
            required: [
                "success",
                "statusCode",
                "message",
                "errors",
                "timestamp",
            ],
            properties: {
                success: { type: "boolean", example: false },
                statusCode: { type: "integer", example: 400 },
                message: { type: "string" },
                errors: {
                    type: "array",
                    items: {},
                },
                timestamp: timestampSchema,
                stack: {
                    type: "string",
                    description: "Only present in development responses.",
                },
            },
        },
        ValidationError: {
            allOf: [{ $ref: "#/components/schemas/ApiError" }],
        },
        PaginationMeta: {
            type: "object",
            properties: {
                currentPage: { type: "integer", example: 1 },
                totalPages: { type: "integer", example: 3 },
                pageSize: { type: "integer", example: 10 },
                totalCount: { type: "integer", example: 25 },
                hasNextPage: { type: "boolean", example: true },
                hasPreviousPage: { type: "boolean", example: false },
            },
        },
        User: {
            type: "object",
            properties: {
                _id: idSchema,
                username: { type: "string" },
                email: { type: "string", format: "email" },
                fullName: { type: "string" },
                avatar: { type: "string", format: "uri" },
                coverImage: { type: "string" },
                emailVerifiedAt: { ...timestampSchema, nullable: true },
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        AuthTokens: {
            type: "object",
            properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
            },
        },
        LoginResponseData: {
            type: "object",
            properties: {
                user: { $ref: "#/components/schemas/User" },
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
            },
        },
        Session: {
            type: "object",
            properties: {
                _id: idSchema,
                userId: idSchema,
                userAgent: { type: "string", nullable: true },
                ipAddress: { type: "string", nullable: true },
                expiresAt: timestampSchema,
                revokedAt: { ...timestampSchema, nullable: true },
                lastUsedAt: timestampSchema,
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        Video: {
            type: "object",
            properties: {
                _id: idSchema,
                videoFile: { type: "string", format: "uri" },
                thumbnail: { type: "string", format: "uri" },
                title: { type: "string" },
                description: { type: "string" },
                duration: { type: "number" },
                views: { type: "integer" },
                isPublished: { type: "boolean" },
                owner: {
                    oneOf: [idSchema, { $ref: "#/components/schemas/User" }],
                },
                likesCount: { type: "integer" },
                commentsCount: { type: "integer" },
                isLiked: { type: "boolean" },
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        Comment: {
            type: "object",
            properties: {
                _id: idSchema,
                content: { type: "string" },
                video: idSchema,
                owner: {
                    oneOf: [idSchema, { $ref: "#/components/schemas/User" }],
                },
                likesCount: { type: "integer" },
                isLiked: { type: "boolean" },
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        Like: {
            type: "object",
            properties: {
                _id: idSchema,
                video: { ...idSchema, nullable: true },
                comment: { ...idSchema, nullable: true },
                tweet: { ...idSchema, nullable: true },
                likedBy: idSchema,
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        Playlist: {
            type: "object",
            properties: {
                _id: idSchema,
                name: { type: "string" },
                description: { type: "string" },
                owner: {
                    oneOf: [idSchema, { $ref: "#/components/schemas/User" }],
                },
                isPublic: { type: "boolean" },
                videos: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Video" },
                },
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        Subscription: {
            type: "object",
            properties: {
                _id: idSchema,
                subscriber: {
                    oneOf: [idSchema, { $ref: "#/components/schemas/User" }],
                },
                channel: {
                    oneOf: [idSchema, { $ref: "#/components/schemas/User" }],
                },
                createdAt: timestampSchema,
                updatedAt: timestampSchema,
            },
        },
        Healthcheck: {
            type: "object",
            properties: {
                status: { type: "string", example: "ok" },
                timestamp: timestampSchema,
                uptime: { type: "number" },
                environment: { type: "string" },
            },
        },
        DashboardStats: {
            type: "object",
            properties: {
                totalVideos: { type: "integer" },
                totalViews: { type: "integer" },
                totalSubscribers: { type: "integer" },
                totalLikes: { type: "integer" },
            },
        },
        RegisterRequest: {
            type: "object",
            required: ["username", "email", "fullName", "password", "avatar"],
            properties: {
                username: { type: "string" },
                email: { type: "string", format: "email" },
                fullName: { type: "string" },
                password: { type: "string", format: "password" },
                avatar: { type: "string", format: "binary" },
                coverImage: { type: "string", format: "binary" },
            },
        },
        LoginRequest: {
            type: "object",
            required: ["password"],
            properties: {
                email: { type: "string", format: "email" },
                username: { type: "string" },
                password: { type: "string", format: "password" },
            },
        },
        RefreshTokenRequest: {
            type: "object",
            properties: {
                refreshToken: { type: "string" },
            },
        },
        ChangePasswordRequest: {
            type: "object",
            required: ["oldPassword", "newPassword"],
            properties: {
                oldPassword: { type: "string", format: "password" },
                newPassword: { type: "string", format: "password" },
            },
        },
        UpdateAccountRequest: {
            type: "object",
            properties: {
                fullName: { type: "string" },
                email: { type: "string", format: "email" },
            },
        },
        VideoCreateRequest: {
            type: "object",
            required: ["title", "description", "videoFile", "thumbnail"],
            properties: {
                title: { type: "string" },
                description: { type: "string" },
                videoFile: { type: "string", format: "binary" },
                thumbnail: { type: "string", format: "binary" },
            },
        },
        VideoUpdateRequest: {
            type: "object",
            properties: {
                title: { type: "string" },
                description: { type: "string" },
                thumbnail: { type: "string", format: "binary" },
            },
        },
        CommentRequest: {
            type: "object",
            required: ["content"],
            properties: {
                content: { type: "string" },
            },
        },
        PlaylistRequest: {
            type: "object",
            required: ["name"],
            properties: {
                name: { type: "string" },
                description: { type: "string" },
            },
        },
    },
    responses: {
        BadRequest: {
            description: "Bad request.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        Unauthorized: {
            description: "Authentication required or token invalid.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        Forbidden: {
            description: "Authenticated user lacks permission.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        NotFound: {
            description: "Resource not found.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        Conflict: {
            description: "Resource conflict.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        PayloadTooLarge: {
            description: "Request body or upload too large.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        RateLimited: {
            description: "Rate limit exceeded.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
        InternalServerError: {
            description: "Unexpected server error.",
            content: jsonContent({ $ref: "#/components/schemas/ApiError" }),
        },
    },
};

export {
    components,
    emptySuccessResponse,
    idParameter,
    jsonContent,
    multipartContent,
    paginatedResponse,
    paginationParameters,
    standardErrors,
    successResponse,
    usernameParameter,
    videoListParameters,
};
