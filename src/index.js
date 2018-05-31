import path from 'path';
import Scraper from './courseScraper';
import Downloader from './courseDownloader';
import { puppeteerMeta, pageMeta } from './../config/dev.config.json';

(async () => {
  const courseName = 'learning-react-native-2';
  await new Scraper(courseName).boot(puppeteerMeta, pageMeta);

  await new Downloader(courseName).download();
})();
