import { JobNames, QueueNames } from "../job.constants.js";
import { BaseJobProducer } from "./base-job.producer.js";

class NotificationJobProducer extends BaseJobProducer {
    constructor() {
        super({
            queueName: QueueNames.NOTIFICATION,
            context: "notification-job-producer",
        });
    }

    enqueueSecurityNotification(payload) {
        return this.enqueue(JobNames.SEND_SECURITY_NOTIFICATION, payload);
    }
}

export { NotificationJobProducer };
