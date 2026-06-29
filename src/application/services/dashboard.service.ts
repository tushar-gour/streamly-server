// @ts-nocheck
import { PaginationDefaults } from "../../shared/constants/index.js";
import { PaginationBuilder } from "../../shared/responses/api-response.js";

class DashboardService {
    constructor({
        videoRepository,
        likeRepository,
        commentRepository,
        subscriptionRepository,
    }) {
        this.videoRepository = videoRepository;
        this.likeRepository = likeRepository;
        this.commentRepository = commentRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    async getChannelStats(channelId) {
        const videoIds =
            await this.videoRepository.getVideoIdsByOwner(channelId);
        const [
            totalSubscribers,
            totalVideos,
            viewsResult,
            totalLikes,
            totalComments,
            recentSubscribers,
        ] = await Promise.all([
            this.subscriptionRepository.countByChannel(channelId),
            this.videoRepository.count({ owner: channelId }),
            this.videoRepository.getTotalViewsByOwner(channelId),
            this.likeRepository.countByVideos(videoIds),
            this.commentRepository.countByVideos(videoIds),
            this.subscriptionRepository.countRecentByChannel(
                channelId,
                new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ),
        ]);

        const totalViews = viewsResult[0]?.totalViews || 0;
        const averageViewsPerVideo =
            totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0;
        const engagementRate =
            totalViews > 0
                ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(2)
                : "0.00";

        return {
            data: {
                overview: {
                    totalSubscribers,
                    totalVideos,
                    totalViews,
                    totalLikes,
                    totalComments,
                },
                metrics: {
                    averageViewsPerVideo,
                    engagementRate: `${engagementRate}%`,
                    recentSubscribers,
                },
                generatedAt: new Date().toISOString(),
            },
            message: "Channel statistics fetched successfully",
        };
    }

    async getChannelVideos({ channelId, query }) {
        const {
            page = PaginationDefaults.PAGE,
            limit = PaginationDefaults.LIMIT,
            sortBy = "createdAt",
            sortType = "desc",
            isPublished,
        } = query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.min(
            Math.max(1, parseInt(limit, 10)),
            PaginationDefaults.MAX_LIMIT
        );

        const [videos, totalDocs] =
            await this.videoRepository.getDashboardVideos({
                channelId,
                pageNum,
                limitNum,
                sortBy,
                sortType,
                isPublished,
            });

        return {
            data: videos,
            pagination: new PaginationBuilder()
                .setPage(pageNum)
                .setLimit(limitNum)
                .setTotalDocs(totalDocs)
                .build(),
            message: "Channel videos fetched successfully",
        };
    }
}

export { DashboardService };
