import { PlaylistRepository } from "../../domain/repositories/playlist.repository.js";
import { createId } from "../../shared/helpers/id-generator.js";
import { prisma } from "../database/prisma/client.js";
import {
    normalizeMongoUpdate,
    toPlaylist,
    toVideo,
} from "../database/prisma-record.mapper.js";

const ownerSelect = {
    id: true,
    username: true,
    fullName: true,
    avatar: true,
};

class PrismaPlaylistRepository extends PlaylistRepository {
    async create(playlistData) {
        return toPlaylist(
            await prisma.playlist.create({
                data: {
                    id: createId(),
                    name: playlistData.name,
                    description: playlistData.description || "",
                    ownerId: playlistData.owner,
                },
                include: { owner: { select: ownerSelect }, videos: true },
            })
        );
    }

    async findById(playlistId) {
        const playlist = await prisma.playlist.findUnique({
            where: { id: playlistId },
            include: { videos: { select: { videoId: true } } },
        });

        if (!playlist) return null;

        const mappedPlaylist = {
            ...toPlaylist(playlist),
            videos: playlist.videos.map((entry) => entry.videoId),
        };

        return {
            ...mappedPlaylist,
            save: () => this.#syncVideos(playlistId, mappedPlaylist.videos),
        };
    }

    async findByIdWithOwner(playlistId) {
        return toPlaylist(
            await prisma.playlist.findUnique({
                where: { id: playlistId },
                include: { owner: { select: ownerSelect }, videos: true },
            })
        );
    }

    async findByIdWithOwnerAndVideos(playlistId) {
        return toPlaylist(
            await prisma.playlist.findUnique({
                where: { id: playlistId },
                include: {
                    owner: { select: ownerSelect },
                    videos: {
                        include: {
                            video: true,
                        },
                        orderBy: { createdAt: "asc" },
                    },
                },
            })
        );
    }

    async updateById(playlistId, updateData) {
        return toPlaylist(
            await prisma.playlist.update({
                where: { id: playlistId },
                data: normalizeMongoUpdate(updateData),
                include: { owner: { select: ownerSelect }, videos: true },
            })
        );
    }

    deleteById(playlistId) {
        return prisma.playlist.delete({ where: { id: playlistId } });
    }

    async getByIdWithDetails(playlistId) {
        const playlist = await prisma.playlist.findUnique({
            where: { id: playlistId },
            include: {
                owner: { select: ownerSelect },
                videos: {
                    include: {
                        video: {
                            include: {
                                owner: { select: ownerSelect },
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
            },
        });

        if (!playlist) return [];

        const videos = playlist.videos.map((entry) => toVideo(entry.video));

        return [
            {
                ...toPlaylist({ ...playlist, videos: [] }),
                videos,
                videosCount: videos.length,
                totalViews: videos.reduce(
                    (total, video) => total + (video.views || 0),
                    0
                ),
            },
        ];
    }

    async getUserPlaylists(userId) {
        const playlists = await prisma.playlist.findMany({
            where: { ownerId: userId },
            include: {
                videos: {
                    include: { video: { select: { thumbnail: true } } },
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return playlists.map((playlist) => {
            const firstVideo = playlist.videos[0]?.video;
            return {
                _id: playlist.id,
                name: playlist.name,
                description: playlist.description,
                videosCount: playlist.videos.length,
                thumbnail: firstVideo?.thumbnail,
                createdAt: playlist.createdAt,
                updatedAt: playlist.updatedAt,
            };
        });
    }

    async #syncVideos(playlistId, videoEntries) {
        const operations = [
            prisma.playlistVideo.deleteMany({ where: { playlistId } }),
        ];

        if (videoEntries.length > 0) {
            operations.push(
                prisma.playlistVideo.createMany({
                    data: videoEntries.map((entry) => ({
                        playlistId,
                        videoId: entry.videoId ?? entry,
                    })),
                    skipDuplicates: true,
                })
            );
        }

        await prisma.$transaction(operations);

        return this.findById(playlistId);
    }
}

export { PrismaPlaylistRepository };
