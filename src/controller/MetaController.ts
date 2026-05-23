import { Request, Response, Router } from 'express';
import winston from 'winston';
import * as ytSearch from 'yt-search';

export class MetaController {
  public readonly router: Router;
  private readonly logger: winston.Logger;

  public constructor(logger: winston.Logger) {
    this.router = Router();
    this.logger = logger;

    this.router.get('/meta/:type/:id.json', this.getMeta.bind(this));
    this.router.get('/:config/meta/:type/:id.json', this.getMeta.bind(this));
  }

  private async getMeta(req: Request, res: Response) {
    const type = req.params['type'] as string;
    const id = req.params['id'] as string;

    if (type !== 'channel' || !id || !id.startsWith('webstreamr_yt_channel:')) {
      res.status(404).send('Not Found');
      return;
    }

    const channelUrl = id.replace('webstreamr_yt_channel:', '');
    this.logger.info(`Fetching meta for YouTube channel: ${channelUrl}`);

    try {
      const results: any = await ytSearch.search(channelUrl);
      
      // We assume the first channel match is the one.
      const channel = results.channels[0];
      
      if (!channel) {
        res.status(404).send('Channel not found');
        return;
      }

      // Fetch some videos (yt-search returns some videos in the search results)
      // Since ytSearch doesn't officially support "get videos for channel", we'll just return the videos
      // from the general search results that belong to this channel.
      const videos = results.videos.filter((v: any) => v.author.url === channel.url).slice(0, 50).map((v: any) => ({
        id: `yt_id:${v.videoId}`,
        title: v.title,
        released: new Date().toISOString(),
        thumbnail: v.thumbnail || '',
        streams: [{ ytId: v.videoId }] // Stremio native playback support!
      }));

      // If we don't have videos, we can just do a search using the channel's exact name
      if (videos.length === 0) {
         const extraSearch: any = await ytSearch.search(channel.name);
         extraSearch.videos.filter((v: any) => v.author.url === channel.url).slice(0, 50).forEach((v: any) => {
             videos.push({
                id: `yt_id:${v.videoId}`,
                title: v.title,
                released: new Date().toISOString(),
                thumbnail: v.thumbnail || '',
                streams: [{ ytId: v.videoId }]
             });
         });
      }

      const meta = {
        id: id,
        type: 'channel',
        name: channel.name,
        poster: channel.image || channel.thumbnail || '',
        description: `Subscribers: ${channel.subCountLabel || 'Unknown'} | Videos: ${channel.videoCount || 0}`,
        posterShape: 'square',
        background: channel.image || '',
        videos: videos
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
      res.send(JSON.stringify({ meta }));
    } catch (error: any) {
      this.logger.error(`Error fetching YouTube meta: ${error.message}`);
      res.status(500).send('Internal Server Error');
    }
  }
}
