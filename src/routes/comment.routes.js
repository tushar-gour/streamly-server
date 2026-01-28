import { Router } from "express";

import { verifyJWT, optionalAuth } from "../middlewares/auth.middleware.js";
import {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
} from "../controllers/comment.controller.js";

const router = Router();

router.route("/:videoId").get(optionalAuth, getVideoComments);

router.route("/:videoId").post(verifyJWT, addComment);

router.route("/c/:commentId").patch(verifyJWT, updateComment);

router.route("/c/:commentId").delete(verifyJWT, deleteComment);

export default router;
