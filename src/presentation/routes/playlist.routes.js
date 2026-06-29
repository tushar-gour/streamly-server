import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    requireOwnershipOrPermission,
    requirePermission,
} from "../middlewares/authorization.middleware.js";
import {
    createPlaylist,
    getPlaylistById,
    getUserPlaylists,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(requirePermission("playlist:create"), createPlaylist);

router.route("/:playlistId").get(getPlaylistById);

router.route("/:playlistId").patch(
    requireOwnershipOrPermission({
        policy: "canUpdatePlaylist",
        ownPermission: "playlist:update:own",
        anyPermission: "playlist:update:any",
    }),
    updatePlaylist
);

router.route("/:playlistId").delete(
    requireOwnershipOrPermission({
        policy: "canDeletePlaylist",
        ownPermission: "playlist:delete:own",
        anyPermission: "playlist:delete:any",
    }),
    deletePlaylist
);

router.route("/user/:userId").get(getUserPlaylists);

router.route("/add/:videoId/:playlistId").patch(
    requireOwnershipOrPermission({
        policy: "canManagePlaylistVideos",
        ownPermission: "playlist:video:manage:own",
        anyPermission: "playlist:video:manage:any",
    }),
    addVideoToPlaylist
);

router.route("/remove/:videoId/:playlistId").patch(
    requireOwnershipOrPermission({
        policy: "canManagePlaylistVideos",
        ownPermission: "playlist:video:manage:own",
        anyPermission: "playlist:video:manage:any",
    }),
    removeVideoFromPlaylist
);

export default router;
