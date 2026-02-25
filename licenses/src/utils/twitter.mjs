import fs from 'fs'
import { TwitterApi } from 'twitter-api-v2';

import { twitter } from '../config.mjs';
import { getLogger } from './logging.mjs';

const twitterClient = new TwitterApi(twitter);

const tweetStatus = async (status, media = null) => {
   getLogger().info(`[TWITTER] Tweeting status: ${status} with media: ${media ? 'yes' : 'no'}`);

   const resp = await twitterClient.v2.tweet({
      text: status,
      media: media ? { media_ids: [media] } : undefined
   });

   getLogger().info(`[TWITTER] Status tweeted with ID: ${resp}`);
}

const tweetMedia = (imagePath, cb) => {
   var media = fs.readFileSync(imagePath);
   twitterClient.v1.uploadMedia(media, { mimeType: 'image/jpeg' }).then(mediaId => {
      getLogger().info(`[TWITTER] Media uploaded with media ID: ${mediaId}`);
      cb(mediaId);
   }).catch(err => {
      getLogger().error(`[TWITTER] Error uploading media: ${err}`);
   });
}


const tweetImageMedia = (media, cb) => {
   getLogger().info(`[TWITTER] Uploading media for tweet...`);
   twitterClient.v1.uploadMedia(media, { mimeType: 'image/jpeg' }).then(mediaId => {
      getLogger().info(`[TWITTER] Media uploaded with media ID: ${mediaId}`);
      cb(mediaId);
   }).catch(err => {
      getLogger().error(`[TWITTER] Error uploading media: ${err}`);
   });
}

export {
   tweetStatus,
   tweetMedia,
   tweetImageMedia
}