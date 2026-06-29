import { container } from "../../core/container/index.js";
import { asyncHandler } from "../../shared/helpers/async-handler.js";
import { ApiResponse } from "../../shared/responses/api-response.js";

const userService = container.services.userService;
const authService = container.services.authService;

class UserController {
    static register = asyncHandler(async (req, res) => {
        const result = await userService.register({
            body: req.body,
            files: req.files,
        });
        return res
            .status(result.statusCode)
            .json(ApiResponse.created(result.data, result.message));
    });

    static login = asyncHandler(async (req, res) => {
        const result = await userService.login({
            body: req.body,
            userAgent: req.get("user-agent"),
            ipAddress: req.ip,
        });
        const cookieOptions = authService.getCookieOptions();

        return res
            .status(200)
            .cookie("accessToken", result.accessToken, cookieOptions)
            .cookie(
                "refreshToken",
                result.refreshToken,
                authService.getRefreshCookieOptions()
            )
            .json(ApiResponse.success(result.data, result.message));
    });

    static logout = asyncHandler(async (req, res) => {
        const result = await userService.logout({
            userId: req.user._id,
            sessionId: req.auth?.sessionId,
        });
        const cookieOptions = authService.getCookieOptions();

        return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(ApiResponse.success(result.data, result.message));
    });

    static logoutAll = asyncHandler(async (req, res) => {
        const result = await userService.logoutAll(req.user._id);
        const cookieOptions = authService.getCookieOptions();

        return res
            .status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(ApiResponse.success(result.data, result.message));
    });

    static refreshAccessToken = asyncHandler(async (req, res) => {
        const result = await userService.refreshAccessToken({
            refreshToken:
                req.cookies?.refreshToken ||
                req.body?.refreshToken ||
                req.header("X-Refresh-Token"),
        });
        const cookieOptions = authService.getCookieOptions();

        return res
            .status(200)
            .cookie("accessToken", result.accessToken, cookieOptions)
            .cookie(
                "refreshToken",
                result.refreshToken,
                authService.getRefreshCookieOptions()
            )
            .json(ApiResponse.success(result.data, result.message));
    });

    static getCurrentUser = asyncHandler(async (req, res) => {
        const result = userService.getCurrentUser(req.user);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static changePassword = asyncHandler(async (req, res) => {
        const result = await userService.changePassword({
            userId: req.user._id,
            body: req.body,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static updateAccountDetails = asyncHandler(async (req, res) => {
        const result = await userService.updateAccountDetails({
            userId: req.user._id,
            body: req.body,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static updateAvatar = asyncHandler(async (req, res) => {
        const result = await userService.updateAvatar({
            userId: req.user._id,
            file: req.file,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static updateCoverImage = asyncHandler(async (req, res) => {
        const result = await userService.updateCoverImage({
            userId: req.user._id,
            file: req.file,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static getChannelProfile = asyncHandler(async (req, res) => {
        const result = await userService.getChannelProfile({
            username: req.params.username,
            currentUserId: req.user?._id,
        });
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });

    static getWatchHistory = asyncHandler(async (req, res) => {
        const result = await userService.getWatchHistory(req.user._id);
        return res
            .status(200)
            .json(ApiResponse.success(result.data, result.message));
    });
}

export const registerUser = UserController.register;
export const loginUser = UserController.login;
export const logoutUser = UserController.logout;
export const logoutAllSessions = UserController.logoutAll;
export const refreshAccessToken = UserController.refreshAccessToken;
export const changeCurrentPassword = UserController.changePassword;
export const getCurrentUser = UserController.getCurrentUser;
export const updateAccountDetails = UserController.updateAccountDetails;
export const updateUserAvatar = UserController.updateAvatar;
export const updateCoverImage = UserController.updateCoverImage;
export const getUserChannelProfile = UserController.getChannelProfile;
export const getWatchHistory = UserController.getWatchHistory;

export { UserController };
