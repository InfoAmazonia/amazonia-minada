import cron from 'cron';

console.log('Application is running...');

/** At 00:01 am - everyday */
new cron.CronJob('1 0 * * *', () => {
   console.log(`\nStarting backup at ${new Date().toUTCString()}`);

   backup({
      uri: 'mongodb://database/icfj',
      root: path.resolve(process.cwd(), 'dump'),
      tar: 'backup.tar',
      callback: (err) => {
        if (err) {
          throw err;
        } 
        
        console.log(`Finishing backup at ${new Date().toUTCString()}`);
      }
    });
}, null, true, 'America/Sao_Paulo');