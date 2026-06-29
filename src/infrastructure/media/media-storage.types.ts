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
