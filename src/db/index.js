import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

class DatabaseConnection {
    static #instance = null;
    #isConnected = false;
    #connection = null;

    constructor() {
        if (DatabaseConnection.#instance) {
            return DatabaseConnection.#instance;
        }
        DatabaseConnection.#instance = this;
        this.#setupEventListeners();
    }

    static getInstance() {
        if (!DatabaseConnection.#instance) {
            DatabaseConnection.#instance = new DatabaseConnection();
        }
        return DatabaseConnection.#instance;
    }

    #setupEventListeners() {
        mongoose.connection.on("connected", () => {
            this.#isConnected = true;
            console.log("✓ MongoDB connected successfully");
        });

        mongoose.connection.on("error", (error) => {
            console.error("✗ MongoDB connection error:", error.message);
        });

        mongoose.connection.on("disconnected", () => {
            this.#isConnected = false;
            console.warn("⚠ MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
            this.#isConnected = true;
            console.log("✓ MongoDB reconnected");
        });

        process.on("SIGINT", async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on("SIGTERM", async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    #getConnectionOptions() {
        const isProduction = process.env.NODE_ENV === "production";

        return {
            maxPoolSize: isProduction ? 50 : 10,
            minPoolSize: isProduction ? 10 : 2,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            retryWrites: true,
            w: "majority",
        };
    }

    async connect() {
        if (this.#isConnected && this.#connection) {
            console.log("→ Using existing database connection");
            return this.#connection;
        }

        try {
            const connectionString = `${process.env.MONGODB_URI}/${DB_NAME}`;

            console.log(`→ Connecting to MongoDB...`);
            console.log(`  Database: ${DB_NAME}`);

            const connectionInstance = await mongoose.connect(
                connectionString,
                this.#getConnectionOptions()
            );

            this.#connection = connectionInstance.connection;
            this.#isConnected = true;

            console.log(`✓ MongoDB connected`);
            console.log(`  Host: ${this.#connection.host}`);
            console.log(`  Port: ${this.#connection.port}`);
            console.log(`  Database: ${this.#connection.name}`);

            return this.#connection;
        } catch (error) {
            console.error("✗ MongoDB connection FAILED:", error.message);
            throw error;
        }
    }

    async disconnect() {
        if (!this.#isConnected) {
            console.log("→ Already disconnected from database");
            return;
        }

        try {
            await mongoose.disconnect();
            this.#isConnected = false;
            this.#connection = null;
            console.log("✓ MongoDB disconnected gracefully");
        } catch (error) {
            console.error(
                "✗ Error during database disconnection:",
                error.message
            );
            throw error;
        }
    }

    isConnected() {
        return this.#isConnected && mongoose.connection.readyState === 1;
    }

    getConnectionState() {
        return mongoose.connection.readyState;
    }

    getConnection() {
        return this.#connection;
    }

    async healthCheck() {
        const start = Date.now();

        try {
            if (!this.isConnected()) {
                return {
                    status: "disconnected",
                    latency: 0,
                    readyState: this.getConnectionState(),
                };
            }

            await mongoose.connection.db.admin().ping();
            const latency = Date.now() - start;

            return {
                status: "healthy",
                latency,
                readyState: this.getConnectionState(),
                host: this.#connection?.host,
                database: this.#connection?.name,
            };
        } catch (error) {
            return {
                status: "unhealthy",
                latency: Date.now() - start,
                error: error.message,
            };
        }
    }

    async withTransaction(callback) {
        const session = await mongoose.startSession();

        try {
            session.startTransaction();
            const result = await callback(session);
            await session.commitTransaction();
            return result;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

const databaseConnection = DatabaseConnection.getInstance();

const connectDB = async () => {
    return databaseConnection.connect();
};

export default connectDB;
export { DatabaseConnection, databaseConnection };
