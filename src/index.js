import path from 'path';
import Scraper from './courseScraper';
import Downloader from './courseDownloader';

(async () => {
  const courseName = 'learning-react-native-2';
  await new Scraper(courseName).boot({
    headless: false,
    userDataDir: path.join(__dirname, '../puppeteer-data-dir'),
    executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  }, {
    width: 1500,
    height: 1024,
    setBypassCSP: true,
  });

  await new Downloader(courseName).download();
})();
