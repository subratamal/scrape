import path from 'path';
import CourseScraper from './courseScraper';
import CourseDownloader from './courseDownloader';

const courseName = '';
new CourseScraper(courseName).boot({
  headless: true,
  userDataDir: path.join(__dirname, '../puppeteer-data-dir'),
  executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
}, {
  width: 1500,
  height: 1024,
  setBypassCSP: true,
});

new CourseDownloader(courseName).downloadAll()
  .then(dir => console.log(`All courses in the course '${CourseDownloader}' downloaded @${dir}.`));
