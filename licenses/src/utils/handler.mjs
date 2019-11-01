import cron from 'cron';

const cronTab = (interval, cb, turnOn = true) => {
   if(!turnOn)
      return cb();
   
   new cron.CronJob(interval, cb, null, true, 'America/Sao_Paulo');
}

const ifMayNotIgnore = (ex) => {
   return { 
      throw: () => {         
         if(parseInt(ex.err) !== 11000 && parseInt(ex.code) != 16755 && parseInt(ex.code) !== 2) {
            throw ex;
         }

         return true;
      }
   }
}

export {
   cronTab,
   ifMayNotIgnore
}