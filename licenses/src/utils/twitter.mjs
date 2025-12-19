import fs from 'fs'
import Twitter from 'twitter';

import { twitter } from '../config.mjs';
import { getLogger } from './logging.mjs';

const twitterClient = new Twitter(twitter);

const tweetStatus = (status, media = null) => {
   const data = media ? Object.assign({ status }, { media_ids: media }) : { status };

   twitterClient.post('statuses/update', data, function(error, tweets, response) {
      if (error) {
         getLogger().error(error);
      }
   });
}

const tweetMedia = (imagePath, cb) => {
   var media = fs.readFileSync(imagePath);

   twitterClient.post('media/upload', { media }, function(error, media, response) {
      if (!error)
         cb(media.media_id_string); 
      else
         throw error;
   });
}


const tweetImageMedia = (media, cb) => {
   twitterClient.post('media/upload', { media }, function(error, media, response) {
      if (!error)
         cb(media.media_id_string); 
      else
         throw error;
   });
}

export {
   tweetStatus,
   tweetMedia,
   tweetImageMedia
}