// @ts-nocheck

import bcrypt from "bcrypt";

import { appConfig, isProduction } from "../../config/env.js";
import { prisma } from "../../infrastructure/database/prisma/client.js";
import { createCaptchaProvider } from "../../infrastructure/security/captcha/captcha-provider.factory.js";
import { CaptchaRiskService } from "../../infrastructure/security/captcha/captcha-risk.service.js";
import {
    toPublicUser,
    withId,
} from "../../infrastructure/database/prisma-record.mapper.js";
import { ApiError, UnauthorizedError } from "../../shared/errors/api-error.js";
import { SuccessMessages } from "../../shared/constants/index.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { OtpService } from "./otp.service.js";
import type { MfaService } from "./mfa.service.js";

type RequestContext = {
    userAgent?: string;
    ipAddress?: string;
    deviceId: string;
    mfaTrustToken?: string;
};

const normalizeIdentifier = (value: string): string =>
    value.trim().toLowerCase();

class AuthPlatformService {
    readonly #otpService: OtpService;
    readonly #mfaService: MfaService;
    readonly #captchaProvider = createCaptchaProvider();
    readonly #captchaRiskService = new CaptchaRiskService();

    constructor({
        otpService,
        mfaService,
        authService,
        roleRepository,
        userRoleRepository,
    }) {
        this.#otpService = otpService;
        this.#mfaService = mfaService;
        this.authService = authService;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
    }

    async signupStart({ email, password, fullName, username }) {
        if (!email || !password || !fullName || !username) {
            throw new ApiError(
                400,
                "Email, password, full name, and username are required"
            );
        }

        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizeIdentifier(email) },
                    { username: normalizeIdentifier(username) },
                ],
            },
        });

        if (existingUser) throw new ApiError(409, "User already exists");

        const saltRounds = isProduction() ? 12 : 10;
        const user = await prisma.user.create({
            data: {
                id: createId(),
                email: normalizeIdentifier(email),
                username: normalizeIdentifier(username),
                fullName,
                password: await bcrypt.hash(password, saltRounds),
                avatar: `${appConfig.publicBaseUrl}/default-avatar.png`,
                coverImage: "",
                onboardingStatus: "email_pending",
            },
        });

        const defaultRole = await this.roleRepository.findByName(
            appConfig.rbac.defaultRole
        );
        if (defaultRole) {
            await this.userRoleRepository.assignRoleToUser(
                user.id,
                defaultRole._id
            );
        }

        const otp = await this.#otpService.createChallenge({
            userId: user.id,
            identifier: user.email,
            channel: "email",
            purpose: "signup_email_verification",
            username: user.username,
        });

        return {
            data: { user: toPublicUser(user), otp },
            message: "Signup started. Verify email OTP to continue.",
        };
    }

    async signupVerifyEmail({ challengeId, code }) {
        const challenge = await this.#otpService.verifyChallenge({
            challengeId,
            code,
            purpose: "signup_email_verification",
        });
        if (!challenge.userId)
            throw new ApiError(400, "Invalid signup challenge");

        const user = await prisma.user.update({
            where: { id: challenge.userId },
            data: {
                emailVerifiedAt: new Date(),
                onboardingStatus: "mfa_pending",
            },
        });

        return {
            data: { user: toPublicUser(user) },
            message: "Email verified. Set up authenticator app to continue.",
        };
    }

    async signupPhoneStart({ userId, phoneNumber, channel }) {
        if (!["sms", "whatsapp"].includes(channel)) {
            throw new ApiError(
                400,
                "Phone verification channel must be sms or whatsapp"
            );
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { phoneNumber },
        });

        const otp = await this.#otpService.createChallenge({
            userId,
            identifier: phoneNumber,
            channel,
            purpose:
                channel === "whatsapp"
                    ? "phone_verification_whatsapp"
                    : "phone_verification_sms",
            username: user.username,
        });

        return {
            data: { otp },
            message: "Phone verification OTP sent.",
        };
    }

    async signupPhoneVerify({ challengeId, code, channel }) {
        const challenge = await this.#otpService.verifyChallenge({
            challengeId,
            code,
            purpose:
                channel === "whatsapp"
                    ? "phone_verification_whatsapp"
                    : "phone_verification_sms",
        });
        if (!challenge.userId)
            throw new ApiError(400, "Invalid phone challenge");

        await prisma.user.update({
            where: { id: challenge.userId },
            data: { phoneVerifiedAt: new Date() },
        });

        return { data: {}, message: "Phone verified successfully." };
    }

    async setupSignupMfa(userId: string) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new ApiError(404, "User not found");

        const setup = await this.#mfaService.setupTotp(user.id, user.email);
        return {
            data: setup,
            message: "Authenticator setup created.",
        };
    }

    async verifySignupMfa(userId: string, code: string) {
        const result = await this.#mfaService.verifyTotpSetup(userId, code);
        return {
            data: result,
            message: "Authenticator verified. Signup completed.",
        };
    }

    async loginStart({ method, identifier, password, context, captchaToken }) {
        if (!method || !identifier) {
            throw new ApiError(400, "Login method and identifier are required");
        }

        const risk = await this.#captchaRiskService.shouldRequireCaptcha(
            "login",
            identifier
        );
        if (risk.captchaRequired && !captchaToken) {
            return {
                data: risk,
                message: "Captcha verification required.",
            };
        }
        if (captchaToken) {
            await this.#captchaProvider.verify({
                token: captchaToken,
                remoteIp: context.ipAddress,
            });
            await this.#captchaRiskService.trust("login", identifier);
        }

        if (method === "email-password") {
            const user = await prisma.user.findFirst({
                where: { email: normalizeIdentifier(identifier) },
            });
            if (
                !user ||
                !password ||
                !(await bcrypt.compare(password, user.password))
            ) {
                await this.#captchaRiskService.recordFailure(
                    "login",
                    identifier
                );
                throw new UnauthorizedError("Invalid credentials");
            }
            await this.#captchaRiskService.clear("login", identifier);
            return this.#completeOrChallenge(user, method, context);
        }

        const otpChannel =
            method === "email-otp"
                ? "email"
                : method === "phone-whatsapp-otp"
                  ? "whatsapp"
                  : "sms";
        const purpose =
            method === "email-otp"
                ? "login_email_otp"
                : method === "phone-whatsapp-otp"
                  ? "login_phone_whatsapp"
                  : "login_phone_sms";
        const user = await prisma.user.findFirst({
            where:
                otpChannel === "email"
                    ? { email: normalizeIdentifier(identifier) }
                    : { phoneNumber: identifier },
        });
        if (!user) throw new UnauthorizedError("Invalid credentials");

        const otp = await this.#otpService.createChallenge({
            userId: user.id,
            identifier,
            channel: otpChannel,
            purpose,
            username: user.username,
        });

        return {
            data: { otpRequired: true, otp },
            message: "OTP required to continue login.",
        };
    }

    async loginVerifyOtp({ challengeId, code, method, context }) {
        const purpose =
            method === "email-otp"
                ? "login_email_otp"
                : method === "phone-whatsapp-otp"
                  ? "login_phone_whatsapp"
                  : "login_phone_sms";
        const challenge = await this.#otpService.verifyChallenge({
            challengeId,
            code,
            purpose,
        });
        if (!challenge.userId)
            throw new ApiError(400, "Invalid login challenge");

        const user = await prisma.user.findUnique({
            where: { id: challenge.userId },
        });
        if (!user) throw new UnauthorizedError("Invalid credentials");

        return this.#completeOrChallenge(user, method, context);
    }

    async loginVerifyMfa({ challengeId, code, context }) {
        const trustToken = await this.#mfaService.verifyChallenge(
            challengeId,
            code,
            context
        );
        const challenge = await prisma.mfaChallenge.findUnique({
            where: { id: challengeId },
        });
        const user = await prisma.user.findUnique({
            where: { id: challenge?.userId || "" },
        });
        if (!user) throw new UnauthorizedError("Invalid MFA challenge");

        const session = await this.authService.createLoginSession({
            user: withId(user),
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
        });

        return {
            data: {
                user: toPublicUser(user),
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                mfaTrustToken: trustToken,
            },
            message: SuccessMessages.LOGIN_SUCCESS,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            mfaTrustToken: trustToken,
        };
    }

    async #completeOrChallenge(user, method: string, context: RequestContext) {
        const publicUser = toPublicUser(user);
        const mfaEnabled = Boolean(user.mfaEnabledAt);
        const trusted =
            mfaEnabled &&
            context.mfaTrustToken &&
            (await this.#mfaService.validateTrustToken(
                user.id,
                context.mfaTrustToken,
                context
            ));

        if (mfaEnabled && !trusted) {
            const challenge = await this.#mfaService.createChallenge(
                user.id,
                method,
                context
            );
            return {
                data: {
                    mfaRequired: true,
                    challengeId: challenge.id,
                    expiresAt: challenge.expiresAt,
                },
                message: "Authenticator code required.",
            };
        }

        const session = await this.authService.createLoginSession({
            user: publicUser,
            userAgent: context.userAgent,
            ipAddress: context.ipAddress,
        });

        return {
            data: {
                user: publicUser,
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
            },
            message: SuccessMessages.LOGIN_SUCCESS,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        };
    }
}

export { AuthPlatformService };
