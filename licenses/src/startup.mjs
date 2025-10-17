export async function jobEntrypoint(cb) {
    InitLogger();
    getLogger().info("ICFG Job");

    try {
        getLogger().info("ICFG Connection to the Database");
        await mongoose.connect(database.uri, database.options);

        await cb();
    }
    catch (err) {
        getLogger().error(err);
    }
}