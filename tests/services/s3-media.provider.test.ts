// @ts-nocheck
import { Readable } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import { S3MediaProvider } from "../../src/infrastructure/media/s3-media.provider.js";

describe("S3MediaProvider", () => {
    it("streams byte ranges with S3 Range reads", async () => {
        const send = vi.fn(async (command) => {
            const name = command.constructor.name;
            if (name === "HeadObjectCommand") {
                return { ContentLength: 1000 };
            }
            if (name === "GetObjectCommand") {
                expect(command.input.Range).toBe("bytes=0-99");
                return {
                    ContentType: "video/mp4",
                    Body: Readable.from(["chunk"]),
                };
            }
            return {};
        });

        const provider = new S3MediaProvider({ send } as never);
        const result = await provider.stream({
            url: "videos/test.mp4",
            range: "bytes=0-99",
        });

        expect(result.statusCode).toBe(206);
        expect(result.headers["Accept-Ranges"]).toBe("bytes");
        expect(result.headers["Content-Range"]).toBe("bytes 0-99/1000");
        expect(result.headers["Content-Length"]).toBe("100");
        expect(result.body).toBeInstanceOf(Readable);
    });
});
