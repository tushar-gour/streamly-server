import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import { ApiError } from "../../shared/errors/api-error.js";
import { HttpStatus } from "../../shared/constants/index.js";
import type {
    MediaStreamProvider,
    MediaStreamRequest,
    MediaStreamResult,
} from "./media-storage.types.js";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const RANGE_HEADER_PATTERN = /^bytes=(\d*)-(\d*)$/;

const pickHeader = (headers: Headers, name: string): string | undefined => {
    const value = headers.get(name);
    return value || undefined;
};

const validateTrustedMediaUrl = (url: string): URL => {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url);
    } catch {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Invalid video media URL");
    }

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
        throw new ApiError(
            HttpStatus.BAD_REQUEST,
            "Unsupported video media URL"
        );
    }

    return parsedUrl;
};

const validateRangeHeader = (range?: string): void => {
    if (!range) return;

    const match = RANGE_HEADER_PATTERN.exec(range);
    if (!match) {
        throw new ApiError(
            HttpStatus.RANGE_NOT_SATISFIABLE,
            "Invalid Range header"
        );
    }

    const [, start, end] = match;
    if (!start && !end) {
        throw new ApiError(
            HttpStatus.RANGE_NOT_SATISFIABLE,
            "Invalid Range header"
        );
    }

    if (start && end && Number(start) > Number(end)) {
        throw new ApiError(
            HttpStatus.RANGE_NOT_SATISFIABLE,
            "Invalid Range header"
        );
    }
};

class CloudinaryStreamProvider implements MediaStreamProvider {
    async stream({
        url,
        range,
    }: MediaStreamRequest): Promise<MediaStreamResult> {
        const parsedUrl = validateTrustedMediaUrl(url);
        validateRangeHeader(range);

        const upstreamResponse = await fetch(parsedUrl, {
            headers: range ? { Range: range } : undefined,
        });

        if (upstreamResponse.status === HttpStatus.RANGE_NOT_SATISFIABLE) {
            return {
                statusCode: HttpStatus.RANGE_NOT_SATISFIABLE,
                headers: {
                    "Accept-Ranges": "bytes",
                    ...(pickHeader(upstreamResponse.headers, "content-range")
                        ? {
                              "Content-Range": pickHeader(
                                  upstreamResponse.headers,
                                  "content-range"
                              ) as string,
                          }
                        : {}),
                },
            };
        }

        if (!upstreamResponse.ok) {
            throw new ApiError(
                upstreamResponse.status,
                "Video stream source unavailable"
            );
        }

        const headers: Record<string, string> = {
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=3600",
        };

        for (const [source, target] of [
            ["content-range", "Content-Range"],
            ["content-length", "Content-Length"],
            ["content-type", "Content-Type"],
        ] as const) {
            const value = pickHeader(upstreamResponse.headers, source);
            if (value) headers[target] = value;
        }

        const nodeStream = upstreamResponse.body
            ? Readable.fromWeb(
                  upstreamResponse.body as unknown as NodeReadableStream
              )
            : undefined;

        return {
            statusCode: upstreamResponse.status,
            headers,
            body: nodeStream,
        };
    }
}

export { CloudinaryStreamProvider };
