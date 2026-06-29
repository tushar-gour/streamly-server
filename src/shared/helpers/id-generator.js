import crypto from "node:crypto";

const createId = () => crypto.randomBytes(12).toString("hex");

export { createId };
