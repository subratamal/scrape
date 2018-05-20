import puppeteer from 'puppeteer';
import path from 'path';
import signale from 'signale';
import EventEmitter from 'events';
import {
  range,
  jsonReaderSync,
  jsonWriter,
} from './../utils';

const config = require('./../../config/config.dev.json');

const coursesMetaConfig = jsonReaderSync(path.resolve('config/courses.json'));
class CourseScraper extends EventEmitter {
  constructor(courseName, browser = {}, page = {}) {
    super();
    this.courseName = courseName;
    this.browser = browser;
    this.page = page;
  }

  async createBrowser(browserOptions = {}) {
    const {
      headless,
      userDataDir,
      executablePath,
    } = browserOptions;

    this.browser = await puppeteer.launch({
      headless,
      userDataDir,
      executablePath,
    });

    signale.info(`Browser version: ${await this.browser.version()}`);
  }

  async createPage(pageOptions) {
    const {
      width,
      height,
      setBypassCSP,
    } = pageOptions;

    this.page = await this.browser.newPage();
    await this.page.setViewport({
      width,
      height,
    });
    await this.page.setBypassCSP(setBypassCSP);
  }

  async boot(browserOptions = {}, pageOptions = {}) {
    const {
      headless,
      userDataDir,
      executablePath,
    } = browserOptions;

    const {
      width,
      height,
      setBypassCSP,
    } = pageOptions;

    await this.createBrowser({
      headless,
      userDataDir,
      executablePath,
    });

    await this.createPage({
      width,
      height,
      setBypassCSP,
    });

    await this.page.goto('https://www.linkedin.com/learning/me', {
      waitUntil: 'networkidle2',
    });

    await this.getCourseChapterMeta(this.courseName);
    await this.getAllChapterURLsForCourse(this.courseName);
    await this.browser.close();
  }

  async getChapterURLsForCourse(courseName, options) {
    const {
      pageNo,
      pageSize,
      chapterPagesCached = [],
    } = options;

    const {
      chapterURLs,
    } = coursesMetaConfig[courseName];

    const sNO = (pageNo * pageSize) < chapterURLs.length ? (pageNo * pageSize) : chapterURLs.length;
    const eNo = ((pageNo + 1) * pageSize) < chapterURLs.length ? ((pageNo + 1) * pageSize) : chapterURLs.length;

    const videoUrlPromises = chapterURLs.slice(sNO, eNo).map(async (href, idx) => {
      const chapterPage = await (chapterPagesCached[idx] || this.browser.newPage());
      chapterPagesCached.push(chapterPage);
      await chapterPage.goto(href, {
        waitUntil: 'networkidle2',
      });
      const videoUrl = await chapterPage.evaluate(() => {
        const videoEl = document.querySelector('.vjs-tech');
        return videoEl ? videoEl.getAttribute('src') : '';
      });
      return videoUrl;
    });

    const videoUrls = await Promise.all(videoUrlPromises);
    return {
      videoUrls,
    };
  }

  async getAllChapterURLsForCourse(courseName) {
    const pageSize = config.courseScrapeMeta.page.PAGE_SIZE;
    const chapterPagesCached = range(pageSize).map(() => this.browser.newPage());

    const videoUrlsAll = [];
    const {
      chapterURLs,
    } = coursesMetaConfig[courseName];
    const pageNos = Math.ceil(chapterURLs.length / pageSize);
    /* eslint-disable no-await-in-loop */
    for (let idx = 0; idx < pageNos; idx += 1) {
      const {
        videoUrls,
      } = await this.getChapterURLsForCourse(courseName, {
        coursesMetaConfig,
        pageNo: idx,
        pageSize,
        chapterPagesCached,
      });
      videoUrlsAll.push(...videoUrls);
    }

    coursesMetaConfig[courseName].chapterVideoURLs = videoUrlsAll;
    await jsonWriter(path.resolve('config/courses.json'), coursesMetaConfig);
    signale.success(`Video URLs prepared for Course Name "${courseName}": ${videoUrlsAll.join('\n')}`);
  }

  async getCourseChapterMeta(courseName) {
    const url = coursesMetaConfig[courseName].root;
    await this.page.goto(url);
    // eslint-disable-next-line no-unused-vars
    this.page.evaluate(_ => window.scrollBy(0, window.innerHeight));
    await this.page.waitForSelector('.course-chapter__items .toc-item');
    const hrefs = await this.page.$$eval('.course-chapter__items .toc-item', elems => elems.map(elem => elem.href));
    // console.log(hrefs);
    coursesMetaConfig[courseName].chapterURLs = hrefs;
    // const { videoUrls } = await chapterUrlsScrape(coursesMetaConfig, courseName, 0, 10);
  }
}

export default CourseScraper;

// eslint-disable-next-line no-underscore-dangle
// await page._client.send('Page.setDownloadBehavior', {
//   behavior: 'allow',
//   downloadPath: path.join(__dirname, '../downloads'),
// });

// const responseHandler = async (response) => {
//   const buffer = await response.buffer();
//   const videoStream = fs.createWriteStream(path.join(__dirname, '../downloads/video.mp4'), {
//     flags: 'a',
//   });
//   videoStream.write(buffer, () => console.log('Chunk written..'));
//   videoStream.end();

//   console.log('called...');

//   console.log('response buffer', buffer);
// };

// page.on('response', responseHandler);
// page.on('requestfinished', _ => console.log('Request completed!'));

// page._client.on('Network.dataReceived', (_) => {
//   console.log('Network.dataReceived called...');
// });
