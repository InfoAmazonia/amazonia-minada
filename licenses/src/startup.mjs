export async function jobEntrypoint(cb) {
    try {
        InitLogger();
        getLogger().info("ICFG Job");

        getLogger().info("ICFG Connection to the Database");
        await mongoose.connect(database.uri, database.options);

        await cb();
    }
    catch (err) {
        console.error(err);
        getLogger().error(err);
    }
}