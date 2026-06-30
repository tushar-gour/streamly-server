// @ts-nocheck
import { Router } from "express";

import { AuthPlatformController } from "../controllers/auth-platform.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/security.middleware.js";

const router = Router();

router.post(
    "/signup/start",
    authRateLimiter,
    AuthPlatformController.signupStart
);
router.post(
    "/signup/verify-email",
    authRateLimiter,
    AuthPlatformController.signupVerifyEmail
);
router.post(
    "/signup/phone/start",
    verifyJWT,
    authRateLimiter,
    AuthPlatformController.signupPhoneStart
);
router.post(
    "/signup/phone/verify",
    authRateLimiter,
    AuthPlatformController.signupPhoneVerify
);
router.post(
    "/signup/mfa/setup",
    verifyJWT,
    authRateLimiter,
    AuthPlatformController.signupMfaSetup
);
router.post(
    "/signup/mfa/verify",
    verifyJWT,
    authRateLimiter,
    AuthPlatformController.signupMfaVerify
);
router.post("/login/start", authRateLimiter, AuthPlatformController.loginStart);
router.post(
    "/login/verify-otp",
    authRateLimiter,
    AuthPlatformController.loginVerifyOtp
);
router.post(
    "/login/verify-mfa",
    authRateLimiter,
    AuthPlatformController.loginVerifyMfa
);

export default router;
