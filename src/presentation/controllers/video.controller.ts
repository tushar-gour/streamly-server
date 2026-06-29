// @ts-nocheck
import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiError } from "../../shared/errors/api-error.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const videoService = container.services.videoService;

class VideoController {
    static getAll = asyncHandler(async (req, res) => {
        const result = await videoService.getAll(req.query);
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

    static getById = asyncHandler(async (req, res) => {
        const result = await videoService.getById({
            videoId: req.params.videoId,
            currentUserId: req.user?._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static publish = asyncHandler(async (req, res) => {
        const result = await videoService.publish({
            body: req.body,
            files: req.files,
            ownerId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.created(result.data, result.message));
    });

    static update = asyncHandler(async (req, res) => {
        const result = await videoService.update({
            videoId: req.params.videoId,
            body: req.body,
            file: req.file,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static delete = asyncHandler(async (req, res) => {
        const result = await videoService.delete({
            videoId: req.params.videoId,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static togglePublish = asyncHandler(async (req, res) => {
        const result = await videoService.togglePublish({
            videoId: req.params.videoId,
            userId: req.user._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static stream = asyncHandler(async (req, res) => {
        const range = Array.isArray(req.headers.range)
            ? req.headers.range[0]
            : req.headers.range;
        const result = await videoService.stream({
            videoId: req.params.videoId,
            currentUserId: req.user?._id,
            range,
        });

        res.status(result.statusCode).set(result.headers);

        if (result.statusCode === 416) {
            return res
                .status(416)
                .json(
                    new ApiError(
                        416,
                        "Requested Range Not Satisfiable"
                    ).toJSON()
                );
        }

        if (!result.body) {
            return res.end();
        }

        return result.body.pipe(res);
    });
}

export const getAllVideos = VideoController.getAll;
export const publishAVideo = VideoController.publish;
export const getVideoById = VideoController.getById;
export const updateVideo = VideoController.update;
export const deleteVideo = VideoController.delete;
export const togglePublishStatus = VideoController.togglePublish;
export const streamVideo = VideoController.stream;

export { VideoController };
