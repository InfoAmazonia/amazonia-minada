import fs from 'fs'
import { TwitterApi } from 'twitter-api-v2';

import { twitter } from '../config.mjs';
import { getLogger } from './logging.mjs';

const twitterClient = new TwitterApi(twitter.appKey);

const tweetStatus = async (status, media = null) => {
   getLogger().info(`[TWITTER] Tweeting status: ${status} with media: ${media ? 'yes' : 'no'}`);

   const resp = await twitterClient.v2.tweet({
      text: status,
      media: media ? { media_ids: [media] } : undefined
   });

   getLogger().info(`[TWITTER] Status tweeted with ID: ${resp}`);
}

const tweetMedia = async (imagePath) => {
   var media = fs.readFileSync(imagePath);
   return twitterClient.v1.uploadMedia(media, { mimeType: 'image/jpeg' });
}


const tweetImageMedia = async (media) => {
   getLogger().info(`[TWITTER] Uploading media for tweet...`);
   return twitterClient.v1.uploadMedia(media, { mimeType: 'image/jpeg' });
}

export {
   tweetStatus,
   tweetMedia,
   tweetImageMedia
}