// @ts-nocheck
import { CacheNamespaces } from "./cache.constants.js";

const namespace = "streamly";

const stableStringify = (value) => {
    if (!value || typeof value !== "object") {
        return String(value ?? "");
    }

    return JSON.stringify(
        Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
                accumulator[key] = value[key];
                return accumulator;
            }, {})
    );
};

const cacheKey = (...parts) => [namespace, ...parts].join(":");

const CacheKeys = Object.freeze({
    videoList(queryParams) {
        return cacheKey(
            CacheNamespaces.VIDEOS,
            "list",
            Buffer.from(stableStringify(queryParams)).toString("base64url")
        );
    },

    videoDetail(videoId) {
        return cacheKey(CacheNamespaces.VIDEO, "detail", videoId);
    },

    videoComments(videoId, queryParams) {
        return cacheKey(
            CacheNamespaces.COMMENTS,
            videoId,
            Buffer.from(stableStringify(queryParams)).toString("base64url")
        );
    },

    videoListPattern() {
        return cacheKey(CacheNamespaces.VIDEOS, "list", "*");
    },

    videoDetailPattern(videoId = "*") {
        return cacheKey(CacheNamespaces.VIDEO, "detail", videoId);
    },

    videoCommentsPattern(videoId = "*") {
        return cacheKey(CacheNamespaces.COMMENTS, videoId, "*");
    },
});

export { CacheKeys };
