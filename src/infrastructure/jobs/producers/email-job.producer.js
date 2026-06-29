import { JobNames, QueueNames } from "../job.constants.js";
import { BaseJobProducer } from "./base-job.producer.js";

class EmailJobProducer extends BaseJobProducer {
    constructor() {
        super({
            queueName: QueueNames.EMAIL,
            context: "email-job-producer",
        });
    }

    enqueueEmailVerification(payload) {
        return this.enqueue(JobNames.SEND_EMAIL_VERIFICATION, payload);
    }
}

export { EmailJobProducer };
