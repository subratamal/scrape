import path from 'path';
import CourseScraper from './courseScraper';

new CourseScraper().boot({
  headless: true,
  userDataDir: path.join(__dirname, '../puppeteer-data-dir'),
  executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
}, {
  width: 1500,
  height: 1024,
  setBypassCSP: true,
});
