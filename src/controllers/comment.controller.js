import mongoose, { isValidObjectId } from "mongoose";

import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import {
    ApiError,
    BadRequestError,
    NotFoundError,
    ForbiddenError,
} from "../utils/ApiError.js";
import { ApiResponse, PaginationBuilder } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PaginationDefaults } from "../constants.js";

class CommentController {
    static #validateObjectId(id, fieldName = "ID") {
        if (!id || !isValidObjectId(id)) {
            throw new BadRequestError(`Invalid ${fieldName}`);
        }
    }

    static async #findCommentOrFail(commentId) {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            throw new NotFoundError("Comment", commentId);
        }
        return comment;
    }

    static #verifyOwnership(comment, userId) {
        if (comment.owner.toString() !== userId.toString()) {
            throw new ForbiddenError(
                "You are not authorized to modify this comment"
            );
        }
    }

    static getVideoComments = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
        } = req.query;

        CommentController.#validateObjectId(videoId, "video ID");

        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const pipeline = [
            { $match: { video: new mongoose.Types.ObjectId(videoId) } },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                _id: 1,
                                username: 1,
                                fullName: 1,
                                avatar: 1,
                            },
                        },
                    ],
                },
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likes",
                },
            },
            {
                $addFields: {
                    owner: { $first: "$owner" },
                    likesCount: { $size: "$likes" },
                    isLiked: req.user
                        ? {
                              $in: [
                                  new mongoose.Types.ObjectId(req.user._id),
                                  "$likes.likedBy",
                              ],
                          }
                        : false,
                },
            },
            { $project: { likes: 0 } },
        ];

        const totalDocs = await Comment.countDocuments({
            video: new mongoose.Types.ObjectId(videoId),
        });

        pipeline.push(
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        );

        const comments = await Comment.aggregate(pipeline);

        const pagination = new PaginationBuilder()
            .setPage(pageNum)
            .setLimit(limitNum)
            .setTotalDocs(totalDocs)
            .build();

        return res
            .status(200)
            .json(
                ApiResponse.paginated(
                    comments,
                    pagination,
                    "Comments fetched successfully"
                )
            );
    });

    static addComment = asyncHandler(async (req, res) => {
        const { videoId } = req.params;
        const { content } = req.body;

        CommentController.#validateObjectId(videoId, "video ID");

        if (!content?.trim()) {
            throw new BadRequestError("Comment content is required");
        }

        const video = await Video.findById(videoId);
        if (!video) {
            throw new NotFoundError("Video", videoId);
        }

        const comment = await Comment.create({
            content: content.trim(),
            video: videoId,
            owner: req.user._id,
        });

        const createdComment = await Comment.findById(comment._id).populate({
            path: "owner",
            select: "_id username fullName avatar",
        });

        return res
            .status(201)
            .json(
                ApiResponse.created(
                    createdComment,
                    "Comment added successfully"
                )
            );
    });

    static updateComment = asyncHandler(async (req, res) => {
        const { commentId } = req.params;
        const { content } = req.body;

        CommentController.#validateObjectId(commentId, "comment ID");

        if (!content?.trim()) {
            throw new BadRequestError("Comment content is required");
        }

        const comment = await CommentController.#findCommentOrFail(commentId);
        CommentController.#verifyOwnership(comment, req.user._id);

        const updatedComment = await Comment.findByIdAndUpdate(
            commentId,
            { $set: { content: content.trim() } },
            { new: true, runValidators: true }
        ).populate({
            path: "owner",
            select: "_id username fullName avatar",
        });

        return res
            .status(200)
            .json(
                ApiResponse.success(
                    updatedComment,
                    "Comment updated successfully"
                )
            );
    });

    static deleteComment = asyncHandler(async (req, res) => {
        const { commentId } = req.params;

        CommentController.#validateObjectId(commentId, "comment ID");

        const comment = await CommentController.#findCommentOrFail(commentId);
        CommentController.#verifyOwnership(comment, req.user._id);

        await Promise.all([
            Comment.findByIdAndDelete(commentId),
            Like.deleteMany({ comment: commentId }),
        ]);

        return res
            .status(200)
            .json(ApiResponse.success({}, "Comment deleted successfully"));
    });
}

export const getVideoComments = CommentController.getVideoComments;
export const addComment = CommentController.addComment;
export const updateComment = CommentController.updateComment;
export const deleteComment = CommentController.deleteComment;

export { CommentController };
