import { prisma } from "./prisma/client.js";

class DatabaseHealthService {
    constructor() {
        this.connected = false;
    }

    markConnected() {
        this.connected = true;
    }

    markDisconnected() {
        this.connected = false;
    }

    getStatus() {
        return {
            connected: this.connected,
            state: this.connected ? "connected" : "disconnected",
        };
    }

    async ping() {
        await prisma.$queryRaw`SELECT 1`;
        this.markConnected();
    }
}

const databaseHealthService = new DatabaseHealthService();

export { DatabaseHealthService, databaseHealthService };
