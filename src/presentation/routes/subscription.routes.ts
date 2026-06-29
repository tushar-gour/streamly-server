// @ts-nocheck
import { Router } from "express";

import { verifyJWT, optionalAuth } from "../middlewares/auth.middleware.js";
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
} from "../controllers/subscription.controller.js";

const router = Router();

router.route("/c/:channelId").get(optionalAuth, getUserChannelSubscribers);

router.route("/c/:channelId").post(verifyJWT, toggleSubscription);

router.route("/u/:subscriberId").get(getSubscribedChannels);

export default router;
