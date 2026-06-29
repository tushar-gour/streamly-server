// @ts-nocheck
import { appConfig } from "../../config/env.js";
import { createLogger } from "../logger/logger.js";
import { createQueue } from "./queue-factory.js";

const queueRegistryLogger = createLogger("queue-registry");

class QueueRegistry {
    #queues = new Map();

    getQueue(queueName) {
        if (!appConfig.jobs.enabled) {
            return null;
        }

        if (!this.#queues.has(queueName)) {
            this.#queues.set(queueName, createQueue(queueName));
            queueRegistryLogger.info({ queueName }, "queue created");
        }

        return this.#queues.get(queueName);
    }

    async closeAll() {
        await Promise.all(
            [...this.#queues.entries()].map(async ([queueName, queue]) => {
                await queue.close();
                queueRegistryLogger.info({ queueName }, "queue closed");
            })
        );
        this.#queues.clear();
    }
}

const queueRegistry = new QueueRegistry();

export { QueueRegistry, queueRegistry };
