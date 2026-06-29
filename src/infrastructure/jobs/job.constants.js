const QueueNames = Object.freeze({
    EMAIL: "streamly-email",
    NOTIFICATION: "streamly-notification",
    THUMBNAIL: "streamly-thumbnail",
    CLEANUP: "streamly-cleanup",
    VERIFICATION: "streamly-verification",
});

const JobNames = Object.freeze({
    SEND_EMAIL_VERIFICATION: "email.verification.send",
    SEND_SECURITY_NOTIFICATION: "notification.security.send",
    GENERATE_THUMBNAIL: "thumbnail.generate",
    CLEANUP_EXPIRED_AUTH: "cleanup.auth.expired",
    VERIFY_JOBS_HEALTH: "jobs.healthcheck",
});

export { JobNames, QueueNames };
