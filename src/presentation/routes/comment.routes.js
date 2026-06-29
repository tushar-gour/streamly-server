import { Router } from "express";

import { verifyJWT, optionalAuth } from "../middlewares/auth.middleware.js";
import {
    requireOwnershipOrPermission,
    requirePermission,
} from "../middlewares/authorization.middleware.js";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/:videoId").get(optionalAuth, getVideoComments);

router
    .route("/:videoId")
    .post(verifyJWT, requirePermission("comment:create"), addComment);

router.route("/c/:commentId").patch(
    verifyJWT,
    requireOwnershipOrPermission({
        policy: "canUpdateComment",
        ownPermission: "comment:update:own",
        anyPermission: "comment:update:any",
    }),
    updateComment
);

router.route("/c/:commentId").delete(
    verifyJWT,
    requireOwnershipOrPermission({
        policy: "canDeleteComment",
        ownPermission: "comment:delete:own",
        anyPermission: "comment:delete:any",
    }),
    deleteComment
);

export default router;
