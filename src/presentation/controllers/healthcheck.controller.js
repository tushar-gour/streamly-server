import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const healthcheckService = container.services.healthcheckService;

class HealthcheckController {
    static healthcheck = asyncHandler(async (_, res) => {
        return res
            .status(200)
            .json(
                ApiResponse.success(healthcheckService.getBasicHealth(), "OK")
            );
    });

    static detailedHealthcheck = asyncHandler(async (_, res) => {
        const result = await healthcheckService.getDetailedHealth();
        return res
            .status(result.statusCode)
            .json(ApiResponse.success(result.data, result.message));
    });
}

export const healthcheck = HealthcheckController.healthcheck;
export const detailedHealthcheck = HealthcheckController.detailedHealthcheck;

export { HealthcheckController };
