CREATE TABLE "users" (
    "id" CHAR(24) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" VARCHAR(100) NOT NULL,
    "avatar" TEXT NOT NULL,
    "coverImage" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "videos" (
    "id" CHAR(24) NOT NULL,
    "videoFile" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
    "id" CHAR(24) NOT NULL,
    "content" VARCHAR(2000) NOT NULL,
    "videoId" CHAR(24) NOT NULL,
    "ownerId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "likes" (
    "id" CHAR(24) NOT NULL,
    "videoId" CHAR(24),
    "commentId" CHAR(24),
    "tweetId" CHAR(24),
    "likedById" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "likes_single_target_check" CHECK (
        (CASE WHEN "videoId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "commentId" IS NULL THEN 0 ELSE 1 END) +
        (CASE WHEN "tweetId" IS NULL THEN 0 ELSE 1 END) = 1
    )
);

CREATE TABLE "playlists" (
    "id" CHAR(24) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "ownerId" CHAR(24) NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "playlist_videos" (
    "playlistId" CHAR(24) NOT NULL,
    "videoId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_videos_pkey" PRIMARY KEY ("playlistId","videoId")
);

CREATE TABLE "subscriptions" (
    "id" CHAR(24) NOT NULL,
    "subscriberId" CHAR(24) NOT NULL,
    "channelId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "watch_history" (
    "userId" CHAR(24) NOT NULL,
    "videoId" CHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watch_history_pkey" PRIMARY KEY ("userId","videoId")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_email_username_idx" ON "users"("email", "username");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE INDEX "videos_ownerId_createdAt_idx" ON "videos"("ownerId", "createdAt");
CREATE INDEX "videos_isPublished_createdAt_idx" ON "videos"("isPublished", "createdAt");
CREATE INDEX "videos_views_idx" ON "videos"("views");
CREATE INDEX "comments_videoId_createdAt_idx" ON "comments"("videoId", "createdAt");
CREATE INDEX "comments_ownerId_createdAt_idx" ON "comments"("ownerId", "createdAt");
CREATE UNIQUE INDEX "likes_videoId_likedById_key" ON "likes"("videoId", "likedById");
CREATE UNIQUE INDEX "likes_commentId_likedById_key" ON "likes"("commentId", "likedById");
CREATE UNIQUE INDEX "likes_tweetId_likedById_key" ON "likes"("tweetId", "likedById");
CREATE INDEX "likes_videoId_idx" ON "likes"("videoId");
CREATE INDEX "likes_commentId_idx" ON "likes"("commentId");
CREATE INDEX "likes_tweetId_idx" ON "likes"("tweetId");
CREATE INDEX "likes_likedById_idx" ON "likes"("likedById");
CREATE INDEX "playlists_ownerId_createdAt_idx" ON "playlists"("ownerId", "createdAt");
CREATE INDEX "playlists_name_ownerId_idx" ON "playlists"("name", "ownerId");
CREATE INDEX "playlists_isPublic_createdAt_idx" ON "playlists"("isPublic", "createdAt");
CREATE UNIQUE INDEX "subscriptions_subscriberId_channelId_key" ON "subscriptions"("subscriberId", "channelId");
CREATE INDEX "subscriptions_channelId_createdAt_idx" ON "subscriptions"("channelId", "createdAt");
CREATE INDEX "subscriptions_subscriberId_createdAt_idx" ON "subscriptions"("subscriberId", "createdAt");

ALTER TABLE "videos" ADD CONSTRAINT "videos_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments" ADD CONSTRAINT "comments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_likedById_fkey" FOREIGN KEY ("likedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_videos" ADD CONSTRAINT "playlist_videos_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_videos" ADD CONSTRAINT "playlist_videos_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
