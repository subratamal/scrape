import path from 'path';
import Scraper from './courseScraper';
import Downloader from './courseDownloader';
import { puppeteerMeta, pageMeta } from './../config/dev.config.json';

(async () => {
  const courseName = 'sketch-essential-training-the-basics-2';
  const scraper = await new Scraper(courseName).boot(puppeteerMeta, pageMeta);
  await scraper.getCourseChapterMeta();
  await scraper.getAllChapterURLsForCourse();
  await scraper.closeBrowser();

  await new Downloader(courseName).download();
})();
