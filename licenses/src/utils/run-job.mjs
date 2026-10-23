// Return an explicit status for both CLI processes and Bree worker threads.
export async function runJob(cb, { connect, disconnect, logger }) {
    let code = 0;
    try {
        await connect();
        await cb();
    } catch (error) {
        code = 1;
        logger.error(`ICFG Job failed: ${error.stack || error}`);
    } finally {
        try {
            await disconnect();
        } catch (error) {
            code = 1;
            logger.error(`ICFG Job disconnect failed: ${error.stack || error}`);
        }
    }
    if (code === 0) logger.info('ICFG Job finished.');
    return code;
}
