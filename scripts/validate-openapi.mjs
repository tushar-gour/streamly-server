import { openApiDocument } from "../src/docs/openapi/openapi-document.js";

const fail = (message) => {
    throw new Error(`OpenAPI validation failed: ${message}`);
};

if (!openApiDocument.openapi?.startsWith("3.")) {
    fail("openapi version must be 3.x");
}

if (!openApiDocument.info?.title || !openApiDocument.info?.version) {
    fail("info.title and info.version are required");
}

if (!openApiDocument.paths || Object.keys(openApiDocument.paths).length === 0) {
    fail("paths are required");
}

if (!openApiDocument.components?.schemas?.ApiResponse) {
    fail("ApiResponse schema is required");
}

if (!openApiDocument.components?.schemas?.ApiError) {
    fail("ApiError schema is required");
}

const operations = Object.values(openApiDocument.paths).flatMap((pathItem) =>
    Object.entries(pathItem)
        .filter(([method]) =>
            ["get", "post", "put", "patch", "delete"].includes(method)
        )
        .map(([, operation]) => operation)
);

for (const operation of operations) {
    if (!operation.tags?.length) {
        fail(`operation missing tags: ${operation.summary}`);
    }

    if (!operation.responses || Object.keys(operation.responses).length === 0) {
        fail(`operation missing responses: ${operation.summary}`);
    }
}

console.log("OpenAPI validation passed.");
console.log(`Documented paths: ${Object.keys(openApiDocument.paths).length}`);
console.log(`Documented operations: ${operations.length}`);
