import { Router } from "express";
import { jobs } from "../job.config.mjs";
import { getLogger } from "../utils/logging.mjs";
import { apiConfig } from "../config.mjs";

export const SecureKeyAuthorizationMiddleware = () => {
    return async (req, res, next) => {
        const auth = req.headers["authorization"];
        if (auth !== undefined && auth !== null) {
            const apiKey = apiConfig.secureKey();

            const b64auth = (auth || '').split(' ')[1] || ''
            const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')

            if(apiKey == password && login == "apikey") {
                req.meta = {
                    UserKey: apiKey
                };
                next();
            }
            else {
                res.status(401);
                res.end();
            }
        }
        else {
            res.status(401);
            res.end();
        }
    }
}

const router = Router();

/** Jobs Control */
router.post("/jobs/now/:jobName", 
    SecureKeyAuthorizationMiddleware,
    (req, resp) => {
    try {
        globalThis.Scheduler.run(req.params.jobName);
        resp.status(200);
    } catch (error) {
        getLogger().error(`Failed to due now job: ${error} `);
        resp.status(500);
    }
    
    resp.end();
});

// - Get the List of Configured Jobs 
router.get("/jobs/list",
    SecureKeyAuthorizationMiddleware,
    (req, resp) => {
    resp.json(jobs);
    resp.status(200);
    resp.end();
});


export {
    router
}