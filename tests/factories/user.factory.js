import { createId } from "../../src/shared/helpers/id-generator.js";

const createTestUserData = (overrides = {}) => {
    const uniqueId = createId();

    return {
        username: `test_user_${uniqueId}`,
        email: `test_${uniqueId}@example.com`,
        fullName: "Test User",
        password: "ValidPassword123!",
        avatar: "https://example.com/avatar.png",
        coverImage: "",
        ...overrides,
    };
};

const createPublicUser = (overrides = {}) => ({
    _id: createId(),
    username: "testuser",
    email: "test@example.com",
    fullName: "Test User",
    avatar: "https://example.com/avatar.png",
    coverImage: "",
    ...overrides,
});

export { createPublicUser, createTestUserData };
