// @ts-nocheck
import crypto from "node:crypto";

import { appConfig } from "../../config/env.js";
import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const authPlatformService = container.services.authPlatformService;
const authService = container.services.authService;

const getDeviceContext = (req, res) => {
    let deviceId = req.cookies?.[appConfig.mfa.deviceCookieName];
    if (!deviceId) {
        deviceId = crypto.randomBytes(24).toString("base64url");
        res.cookie(appConfig.mfa.deviceCookieName, deviceId, {
            ...authService.getCookieOptions(),
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
    }

    return {
        deviceId,
        userAgent: req.get("user-agent"),
        ipAddress: req.ip,
        mfaTrustToken: req.cookies?.[appConfig.mfa.trustCookieName],
    };
};

const setLoginCookies = (res, result) => {
    if (!result.accessToken || !result.refreshToken) return;

    res.cookie(
        "accessToken",
        result.accessToken,
        authService.getCookieOptions()
    );
    res.cookie(
        "refreshToken",
        result.refreshToken,
        authService.getRefreshCookieOptions()
    );

    if (result.mfaTrustToken) {
        res.cookie(appConfig.mfa.trustCookieName, result.mfaTrustToken, {
            ...authService.getCookieOptions(),
            maxAge: appConfig.mfa.trustTokenExpirySeconds * 1000,
        });
    }
};

class AuthPlatformController {
    static signupStart = asyncHandler(async (req, res) => {
        const result = await authPlatformService.signupStart(req.body);
        return res
            .status(201)
            .json(ApiResponse.created(result.data, result.message));
    });

    static signupVerifyEmail = asyncHandler(async (req, res) => {
        const result = await authPlatformService.signupVerifyEmail(req.body);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static signupPhoneStart = asyncHandler(async (req, res) => {
        const result = await authPlatformService.signupPhoneStart({
            userId: req.user._id,
            ...req.body,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static signupPhoneVerify = asyncHandler(async (req, res) => {
        const result = await authPlatformService.signupPhoneVerify(req.body);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static signupMfaSetup = asyncHandler(async (req, res) => {
        const result = await authPlatformService.setupSignupMfa(req.user._id);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static signupMfaVerify = asyncHandler(async (req, res) => {
        const result = await authPlatformService.verifySignupMfa(
            req.user._id,
            req.body.code
        );
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static loginStart = asyncHandler(async (req, res) => {
        const result = await authPlatformService.loginStart({
            ...req.body,
            context: getDeviceContext(req, res),
        });
        setLoginCookies(res, result);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static loginVerifyOtp = asyncHandler(async (req, res) => {
        const result = await authPlatformService.loginVerifyOtp({
            ...req.body,
            context: getDeviceContext(req, res),
        });
        setLoginCookies(res, result);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static loginVerifyMfa = asyncHandler(async (req, res) => {
        const result = await authPlatformService.loginVerifyMfa({
            ...req.body,
            context: getDeviceContext(req, res),
        });
        setLoginCookies(res, result);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });
}

export { AuthPlatformController };
