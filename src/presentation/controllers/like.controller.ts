// @ts-nocheck
import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const likeService = container.services.likeService;

class LikeController {
    static toggleVideoLike = asyncHandler(async (req, res) => {
        const result = await likeService.toggleVideoLike({
            videoId: req.params.videoId,
            userId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.success(result.data, result.message));
    });

    static toggleCommentLike = asyncHandler(async (req, res) => {
        const result = await likeService.toggleCommentLike({
            commentId: req.params.commentId,
            userId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.success(result.data, result.message));
    });

    static toggleTweetLike = asyncHandler(async (req, res) => {
        const result = await likeService.toggleTweetLike({
            tweetId: req.params.tweetId,
            userId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.success(result.data, result.message));
    });

    static getLikedVideos = asyncHandler(async (req, res) => {
        const result = await likeService.getLikedVideos({
            userId: req.user._id,
            query: req.query,
        });
        return res
            .status(200)
            .json(
                ApiResponse.paginated(
                    result.data,
                    result.pagination,
                    result.message
                )
            );
    });
}

export const toggleVideoLike = LikeController.toggleVideoLike;
export const toggleCommentLike = LikeController.toggleCommentLike;
export const toggleTweetLike = LikeController.toggleTweetLike;
export const getLikedVideos = LikeController.getLikedVideos;

export { LikeController };
