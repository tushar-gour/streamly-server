// @ts-nocheck
import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const commentService = container.services.commentService;

class CommentController {
    static getVideoComments = asyncHandler(async (req, res) => {
        const result = await commentService.getVideoComments({
            videoId: req.params.videoId,
            currentUserId: req.user?._id,
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

    static addComment = asyncHandler(async (req, res) => {
        const result = await commentService.addComment({
            videoId: req.params.videoId,
            content: req.body.content,
            userId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.created(result.data, result.message));
    });

    static updateComment = asyncHandler(async (req, res) => {
        const result = await commentService.updateComment({
            commentId: req.params.commentId,
            content: req.body.content,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static deleteComment = asyncHandler(async (req, res) => {
        const result = await commentService.deleteComment({
            commentId: req.params.commentId,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });
}

export const getVideoComments = CommentController.getVideoComments;
export const addComment = CommentController.addComment;
export const updateComment = CommentController.updateComment;
export const deleteComment = CommentController.deleteComment;

export { CommentController };
