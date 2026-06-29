import { ApiError } from "../../shared/errors/api-error.js";
import { HttpStatus } from "../../shared/constants/index.js";
import type {
    MediaStreamProvider,
    MediaStreamResult,
} from "./media-storage.types.js";

class MediaStreamService {
    readonly #provider: MediaStreamProvider;

    constructor(provider: MediaStreamProvider) {
        this.#provider = provider;
    }

    streamVideo(url: string, range?: string): Promise<MediaStreamResult> {
        if (!url) {
            throw new ApiError(HttpStatus.NOT_FOUND, "Video media not found");
        }

        return this.#provider.stream({ url, range });
    }
}

export { MediaStreamService };
