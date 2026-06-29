// @ts-nocheck
import { Router } from "express";

import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requirePermission } from "../middlewares/authorization.middleware.js";
import { authRateLimiter } from "../middlewares/security.middleware.js";
import {
    registerUser,
    loginUser,
    logoutUser,
    logoutAllSessions,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
} from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
    authRateLimiter,
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 },
    ]),
    registerUser
);

router.route("/login").post(authRateLimiter, loginUser);

router.route("/refresh-token").post(authRateLimiter, refreshAccessToken);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/logout-all").post(verifyJWT, logoutAllSessions);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router
    .route("/current-user")
    .get(verifyJWT, requirePermission("user:read:self"), getCurrentUser);

router
    .route("/update-account-details")
    .patch(
        verifyJWT,
        requirePermission("user:update:self"),
        updateAccountDetails
    );

router
    .route("/avatar")
    .patch(
        verifyJWT,
        requirePermission("user:update:self"),
        upload.single("avatar"),
        updateUserAvatar
    );

router
    .route("/cover-image")
    .patch(
        verifyJWT,
        requirePermission("user:update:self"),
        upload.single("coverImage"),
        updateCoverImage
    );

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);

router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
