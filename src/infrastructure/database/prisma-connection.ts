// @ts-nocheck
import { prisma } from "./prisma/client.js";
import { databaseHealthService } from "./database-health.service.js";
import { createLogger, serializeError } from "../logger/logger.js";

const databaseLogger = createLogger("database");

class DatabaseConnection {
    static #instance = null;
    #isConnected = false;

    constructor() {
        if (DatabaseConnection.#instance) {
            return DatabaseConnection.#instance;
        }
        DatabaseConnection.#instance = this;
    }

    static getInstance() {
        if (!DatabaseConnection.#instance) {
            DatabaseConnection.#instance = new DatabaseConnection();
        }
        return DatabaseConnection.#instance;
    }

    async connect() {
        if (this.#isConnected) {
            databaseLogger.debug("using existing database connection");
            return prisma;
        }

        try {
            databaseLogger.info("connecting to postgresql");
            await prisma.$connect();
            await databaseHealthService.ping();
            this.#isConnected = true;
            databaseLogger.info("postgresql connected");
            return prisma;
        } catch (error) {
            this.#isConnected = false;
            databaseHealthService.markDisconnected();
            databaseLogger.error(
                { error: serializeError(error, true) },
                "postgresql connection failed"
            );
            throw error;
        }
    }

    async disconnect() {
        if (!this.#isConnected) {
            databaseLogger.debug("database already disconnected");
            return;
        }

        try {
            await prisma.$disconnect();
            this.#isConnected = false;
            databaseHealthService.markDisconnected();
            databaseLogger.info("postgresql disconnected");
        } catch (error) {
            databaseLogger.error(
                { error: serializeError(error, true) },
                "postgresql disconnection failed"
            );
            throw error;
        }
    }

    isConnected() {
        return this.#isConnected;
    }
}

const databaseConnection = DatabaseConnection.getInstance();

const connectDB = async () => databaseConnection.connect();

export default connectDB;
export { DatabaseConnection, databaseConnection };
