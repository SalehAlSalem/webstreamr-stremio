import { Request, Response, Router } from 'express';
import winston from 'winston';
import * as ytSearch from 'yt-search';

export class CatalogController {
  public readonly router: Router;
  private readonly logger: winston.Logger;

  public constructor(logger: winston.Logger) {
    this.router = Router();
    this.logger = logger;

    this.router.get('/catalog/:type/:id/search=:query.json', this.getCatalog.bind(this));
    this.router.get('/:config/catalog/:type/:id/search=:query.json', this.getCatalog.bind(this));
  }

  private async getCatalog(req: Request, res: Response) {
    const type = req.params['type'] as string;
    const id = req.params['id'] as string;
    const query = req.params['query'] as string;

    if (type !== 'channel' || id !== 'webstreamr_yt_search') {
      res.status(404).send('Not Found');
      return;
    }

    this.logger.info(`Searching YouTube channels for: ${query}`);

    try {
      const results: any = await ytSearch.search(query);
      
      const channels = results.channels.slice(0, 50).map((c: any) => ({
        id: `webstreamr_yt_channel:${c.url}`,
        type: 'channel',
        name: c.name,
        poster: c.image || c.thumbnail || '',
        description: `Subscribers: ${c.subCountLabel || 'Unknown'} | Videos: ${c.videoCount || 0}`,
        posterShape: 'square'
      }));

      const videos = results.videos.slice(0, 20).map((v: any) => ({
        id: `yt_id:${v.videoId}`,
        type: 'movie',
        name: v.title,
        poster: v.thumbnail || '',
        description: `Channel: ${v.author.name} | Views: ${v.views} | Duration: ${v.timestamp}`,
        posterShape: 'landscape'
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
      res.send(JSON.stringify({ metas: [...channels, ...videos] }));
    } catch (error: any) {
      this.logger.error(`Error searching YouTube: ${error.message}`);
      res.status(500).send('Internal Server Error');
    }
  }
}
