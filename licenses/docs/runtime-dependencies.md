# Runtime and dependency consolidation

Node 24.22.1 LTS and Mongoose 9.11.3 match the tested production migration. The MongoDB driver is supplied by Mongoose; obsolete connection options were removed and queue updates use `returnDocument: after`. Preserve restricted database credentials, `autoCreate: false`, `autoIndex: false`, validated staging imports and the chained nightly job.

Use `npm ci` in `licenses`; package-lock.json is authoritative. Compatible dependency and transitive updates supersede Dependabot PRs #2–#13 without downgrading Mongoose/BSON. Legacy `request` and other audit findings still require separate reviewed replacements; this release does not claim an entirely vulnerability-free dependency tree.

Before deployment, run `MONGO_TEST_URI=mongodb://isolated-mongo:27017 npm test` against a disposable MongoDB, never production. Preserve old image/Compose and validate APIs, CSV and receipt-aware ZIP processing. Repository publication does not trigger a production redeployment.
