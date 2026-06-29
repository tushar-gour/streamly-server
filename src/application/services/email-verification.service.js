import { BadRequestError } from "../../shared/errors/api-error.js";
import { audit } from "../../infrastructure/logger/audit-logger.js";
import { createLogger } from "../../infrastructure/logger/logger.js";

const emailVerificationLogger = createLogger("email-verification-service");

class EmailVerificationService {
    constructor({
        emailVerificationTokenRepository,
        tokenService,
        userRepository,
        emailJobProducer,
    }) {
        this.emailVerificationTokenRepository =
            emailVerificationTokenRepository;
        this.tokenService = tokenService;
        this.userRepository = userRepository;
        this.emailJobProducer = emailJobProducer;
    }

    async createVerificationToken(userId) {
        await this.emailVerificationTokenRepository.revokeUnusedUserTokens(
            userId
        );

        const token = this.tokenService.generateOpaqueToken();
        const tokenHash = this.tokenService.hashToken(token);
        const expiresAt =
            this.tokenService.getEmailVerificationTokenExpiresAt();

        await this.emailVerificationTokenRepository.createToken({
            userId,
            tokenHash,
            expiresAt,
        });

        const user = await this.userRepository.findById(userId);

        this.emailJobProducer
            ?.enqueueEmailVerification({
                userId,
                email: user?.email,
                username: user?.username,
                token,
                expiresAt: expiresAt.toISOString(),
            })
            .catch((error) => {
                this.emailJobProducer?.logEnqueueFailure(
                    error,
                    "email.verification.send"
                );
                emailVerificationLogger.warn(
                    { userId },
                    "email verification job enqueue failed"
                );
            });

        return { token, expiresAt };
    }

    async verifyEmailToken(token) {
        if (!token) {
            throw new BadRequestError("Email verification token is required");
        }

        const tokenHash = this.tokenService.hashToken(token);
        const verificationToken =
            await this.emailVerificationTokenRepository.findValidToken(
                tokenHash
            );

        if (!verificationToken) {
            audit.warn("auth.email_verification_failed", {
                reason: "invalid-or-expired-token",
            });
            throw new BadRequestError(
                "Email verification token is invalid or expired"
            );
        }

        await this.emailVerificationTokenRepository.markTokenUsed(
            verificationToken.id
        );
        const user = await this.userRepository.markEmailVerified(
            verificationToken.userId
        );
        audit.info("auth.email_verified", { userId: verificationToken.userId });

        return {
            data: user,
            message: "Email verified successfully",
        };
    }
}

export { EmailVerificationService };
