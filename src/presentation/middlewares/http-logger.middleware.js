const httpLoggerMiddleware = (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
        const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

        req.log?.info(
            {
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                responseTimeMs: Number(durationMs.toFixed(2)),
                contentLength: res.getHeader("content-length"),
                userId: req.user?._id,
                ipAddress: req.ip,
                userAgent: req.get("user-agent"),
            },
            "http request completed"
        );
    });

    next();
};

export { httpLoggerMiddleware };
