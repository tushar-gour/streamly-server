import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const subscriptionService = container.services.subscriptionService;

class SubscriptionController {
    static toggleSubscription = asyncHandler(async (req, res) => {
        const result = await subscriptionService.toggleSubscription({
            channelId: req.params.channelId,
            userId: req.user._id,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.success(result.data, result.message));
    });

    static getChannelSubscribers = asyncHandler(async (req, res) => {
        const result = await subscriptionService.getChannelSubscribers({
            channelId: req.params.channelId,
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

    static getSubscribedChannels = asyncHandler(async (req, res) => {
        const result = await subscriptionService.getSubscribedChannels({
            subscriberId: req.params.subscriberId,
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

export const toggleSubscription = SubscriptionController.toggleSubscription;
export const getUserChannelSubscribers =
    SubscriptionController.getChannelSubscribers;
export const getSubscribedChannels =
    SubscriptionController.getSubscribedChannels;

export { SubscriptionController };
