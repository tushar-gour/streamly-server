// @ts-nocheck
import { Router } from "express";

import {
    healthcheck,
    detailedHealthcheck,
} from "../controllers/healthcheck.controller.js";

const router = Router();

router.route("/").get(healthcheck);

router.route("/detailed").get(detailedHealthcheck);

export default router;
