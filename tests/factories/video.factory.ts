// @ts-nocheck
import { createId } from "../../src/shared/helpers/id-generator.js";

const createTestVideo = (overrides = {}) => ({
    _id: createId(),
    title: "Test Video",
    description: "Test video description",
    videoFile: "https://example.com/video.mp4",
    thumbnail: "https://example.com/thumb.png",
    owner: createId(),
    views: 0,
    duration: 30,
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

export { createTestVideo };
