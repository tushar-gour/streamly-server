// @ts-nocheck
import { cloudinaryService } from "../../infrastructure/cloudinary/cloudinary.service.js";
import { CacheService } from "../../infrastructure/cache/cache.service.js";
import { CloudinaryStreamProvider } from "../../infrastructure/media/cloudinary-stream.provider.js";
import { MediaStreamService } from "../../infrastructure/media/media-stream.service.js";
import { databaseHealthService } from "../../infrastructure/database/database-health.service.js";
import { redisService } from "../../infrastructure/redis/redis.service.js";
import { PrismaCommentRepository } from "../../infrastructure/repositories/comment.repository.js";
import { PrismaLikeRepository } from "../../infrastructure/repositories/like.repository.js";
import { PrismaPlaylistRepository } from "../../infrastructure/repositories/playlist.repository.js";
import { PrismaPermissionRepository } from "../../infrastructure/repositories/permission.repository.js";
import { PrismaRolePermissionRepository } from "../../infrastructure/repositories/role-permission.repository.js";
import { PrismaRoleRepository } from "../../infrastructure/repositories/role.repository.js";
import { PrismaSessionRepository } from "../../infrastructure/repositories/session.repository.js";
import { PrismaSubscriptionRepository } from "../../infrastructure/repositories/subscription.repository.js";
import { PrismaUserRepository } from "../../infrastructure/repositories/user.repository.js";
import { PrismaUserRoleRepository } from "../../infrastructure/repositories/user-role.repository.js";
import { PrismaVideoRepository } from "../../infrastructure/repositories/video.repository.js";
import { PrismaEmailVerificationTokenRepository } from "../../infrastructure/repositories/email-verification-token.repository.js";
import { CleanupJobProducer } from "../../infrastructure/jobs/producers/cleanup-job.producer.js";
import { EmailJobProducer } from "../../infrastructure/jobs/producers/email-job.producer.js";
import { NotificationJobProducer } from "../../infrastructure/jobs/producers/notification-job.producer.js";
import { ThumbnailJobProducer } from "../../infrastructure/jobs/producers/thumbnail-job.producer.js";
import { AuthService } from "../../application/services/auth.service.js";
import { AuthorizationService } from "../../application/services/authorization.service.js";
import { CommentService } from "../../application/services/comment.service.js";
import { DashboardService } from "../../application/services/dashboard.service.js";
import { EmailVerificationService } from "../../application/services/email-verification.service.js";
import { HealthcheckService } from "../../application/services/healthcheck.service.js";
import { LikeService } from "../../application/services/like.service.js";
import { PlaylistService } from "../../application/services/playlist.service.js";
import { PolicyService } from "../../application/services/policy.service.js";
import { SubscriptionService } from "../../application/services/subscription.service.js";
import { TokenService } from "../../application/services/token.service.js";
import { UserService } from "../../application/services/user.service.js";
import { VideoService } from "../../application/services/video.service.js";

const userRepository = new PrismaUserRepository();
const videoRepository = new PrismaVideoRepository();
const commentRepository = new PrismaCommentRepository();
const likeRepository = new PrismaLikeRepository();
const playlistRepository = new PrismaPlaylistRepository();
const subscriptionRepository = new PrismaSubscriptionRepository();
const sessionRepository = new PrismaSessionRepository();
const roleRepository = new PrismaRoleRepository();
const permissionRepository = new PrismaPermissionRepository();
const userRoleRepository = new PrismaUserRoleRepository();
const rolePermissionRepository = new PrismaRolePermissionRepository();
const emailVerificationTokenRepository =
    new PrismaEmailVerificationTokenRepository();
const emailJobProducer = new EmailJobProducer();
const notificationJobProducer = new NotificationJobProducer();
const thumbnailJobProducer = new ThumbnailJobProducer();
const cleanupJobProducer = new CleanupJobProducer();
const cacheService = new CacheService({ redisService });
const mediaStreamService = new MediaStreamService(
    new CloudinaryStreamProvider()
);

const tokenService = new TokenService();
const authService = new AuthService({
    userRepository,
    sessionRepository,
    tokenService,
});
const emailVerificationService = new EmailVerificationService({
    emailVerificationTokenRepository,
    tokenService,
    userRepository,
    emailJobProducer,
});
const authorizationService = new AuthorizationService({
    userRoleRepository,
});
const policyService = new PolicyService({
    videoRepository,
    commentRepository,
    playlistRepository,
});

const container = Object.freeze({
    repositories: {
        userRepository,
        videoRepository,
        commentRepository,
        likeRepository,
        playlistRepository,
        subscriptionRepository,
        sessionRepository,
        roleRepository,
        permissionRepository,
        userRoleRepository,
        rolePermissionRepository,
        emailVerificationTokenRepository,
    },
    services: {
        tokenService,
        authService,
        authorizationService,
        policyService,
        emailVerificationService,
        userService: new UserService({
            userRepository,
            roleRepository,
            userRoleRepository,
            authService,
            cloudinaryService,
            emailVerificationService,
        }),
        videoService: new VideoService({
            videoRepository,
            userRepository,
            likeRepository,
            commentRepository,
            cloudinaryService,
            cacheService,
            authorizationService,
            mediaStreamService,
            thumbnailJobProducer,
        }),
        commentService: new CommentService({
            commentRepository,
            videoRepository,
            likeRepository,
            cacheService,
        }),
        likeService: new LikeService({
            likeRepository,
            videoRepository,
            commentRepository,
            cacheService,
        }),
        playlistService: new PlaylistService({
            playlistRepository,
            videoRepository,
            userRepository,
        }),
        subscriptionService: new SubscriptionService({
            subscriptionRepository,
            userRepository,
        }),
        dashboardService: new DashboardService({
            videoRepository,
            likeRepository,
            commentRepository,
            subscriptionRepository,
        }),
        healthcheckService: new HealthcheckService({
            cloudinaryService,
            databaseHealthService,
            redisService,
        }),
        cacheService,
        mediaStreamService,
    },
    jobs: {
        emailJobProducer,
        notificationJobProducer,
        thumbnailJobProducer,
        cleanupJobProducer,
    },
});

export { container };
