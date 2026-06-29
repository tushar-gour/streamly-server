import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const dashboardService = container.services.dashboardService;

class DashboardController {
    static getChannelStats = asyncHandler(async (req, res) => {
        const result = await dashboardService.getChannelStats(req.user._id);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static getChannelVideos = asyncHandler(async (req, res) => {
        const result = await dashboardService.getChannelVideos({
            channelId: req.user._id,
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

export const getChannelStats = DashboardController.getChannelStats;
export const getChannelVideos = DashboardController.getChannelVideos;

export { DashboardController };
