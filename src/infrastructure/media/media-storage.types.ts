import type { Readable } from "node:stream";

export type MediaStreamRequest = {
    url: string;
    range?: string;
};

export type MediaStreamResult = {
    statusCode: number;
    headers: Record<string, string>;
    body?: Readable;
};

export interface MediaStreamProvider {
    stream(request: MediaStreamRequest): Promise<MediaStreamResult>;
}

export type MediaUploadRequest = {
    localFilePath: string;
    folder: string;
    resourceType?: "image" | "video" | "raw" | "auto";
    contentType?: string;
};

export type MediaUploadResult = {
    publicId: string;
    objectKey: string;
    url: string;
    secureUrl: string;
    resourceType: string;
    bytes?: number;
    duration?: number;
};

export interface MediaStorageProvider {
    upload(request: MediaUploadRequest): Promise<MediaUploadResult | null>;
    delete?(objectKeyOrUrl: string): Promise<boolean>;
    createReadUrl?(
        objectKeyOrUrl: string,
        expiresInSeconds?: number
    ): Promise<string>;
}

export type ThumbnailGenerationRequest = {
    videoId: string;
    videoUrl: string;
};

export type ThumbnailGenerationResult = {
    generated: boolean;
    provider?: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    format?: string;
    mode?: string;
};

export interface ThumbnailProvider {
    generateFromVideo(
        request: ThumbnailGenerationRequest
    ): Promise<ThumbnailGenerationResult>;
}
