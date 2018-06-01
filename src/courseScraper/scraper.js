import path from 'path';
import puppeteer from 'puppeteer';
import signale from 'signale';
import EventEmitter from 'events';
import to from 'await-to-js';
import {
  range,
  jsonReaderSync,
  jsonWriter,
} from './../utils';

const config = require('./../../config/dev.config.json');

global.coursesMetaConfig = global.coursesMetaConfig || jsonReaderSync(path.resolve('config/courses.json'));
class Scraper extends EventEmitter {
  constructor(courseName, browser = {}, page = {}) {
    super();
    this.courseName = courseName;
    this.browser = browser;
    this.page = page;
  }

  async createBrowser(options = {}) {
    const resolution = {
      x : 1920,
      y : 1080,
    };

    const defaultArgs = [
      '--disable-gpu',
      `--window-size=${ resolution.x },${ resolution.y }`,
      '--no-sandbox',
    ];

    const defaultOptions = {
      args: defaultArgs,
      timeout: 60000,
      userDataDir: path.resolve('puppeteer-data-dir')
    };

    const browserOptions = Object.assign({}, defaultOptions, options);

    this.browser = await puppeteer.launch(browserOptions);
    signale.success(`Browser instance created. Version: ${await this.browser.version()}`);
  }

  async closeBrowser() {
    await this.browser.close();
  }

  async createPage(options) {
    const {
      width,
      height,
      setBypassCSP,
    } = options;

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

    return this;
  }

  setVideoUrl(url, videoUrl) {
    const { chaptersMeta } = coursesMetaConfig[this.courseName];
    const chapter = chaptersMeta.find(chapterL => chapterL.url === url);
    chapter.videoUrl = videoUrl;
  }

  async getChapterURLsForCourse(options) {
    const {
      pageNo,
      pageSize,
      chapterPagesCached = [],
    } = options;

    const {
      chaptersMeta,
    } = coursesMetaConfig[this.courseName];

    const sNO = (pageNo * pageSize) < chaptersMeta.length ? (pageNo * pageSize) : chaptersMeta.length;
    const eNo = ((pageNo + 1) * pageSize) < chaptersMeta.length ? ((pageNo + 1) * pageSize) : chaptersMeta.length;

    const videoUrlPromises = chaptersMeta.slice(sNO, eNo).map(async ({ url }, idx) => {
      const chapterPage = await (chapterPagesCached[idx] || this.browser.newPage());
      chapterPagesCached.push(chapterPage);
      await chapterPage.goto(url, {
        waitUntil: 'networkidle2',
      });
      const videoUrl = await chapterPage.evaluate(() => {
        const videoEl = document.querySelector('.vjs-tech');
        return videoEl ? videoEl.getAttribute('src') : '';
      });
      this.setVideoUrl(url, videoUrl);
    });

    await Promise.all(videoUrlPromises);
  }

  async getAllChapterURLsForCourse() {
    const pageSize = config.courseScrapeMeta.page.PAGE_SIZE;
    const chapterPagesCached = range(pageSize).map(() => this.browser.newPage());

    const {
      chaptersMeta,
    } = coursesMetaConfig[this.courseName];
    const pageNos = Math.ceil(chaptersMeta.length / pageSize);
    /* eslint-disable no-await-in-loop */
    for (let idx = 0; idx < pageNos; idx += 1) {
      await this.getChapterURLsForCourse({
        coursesMetaConfig,
        pageNo: idx,
        pageSize,
        chapterPagesCached,
      });
    }
    await jsonWriter(path.resolve('config/courses.json'), coursesMetaConfig);
    signale.success(`Video Urls prepared for Course Name "${this.courseName}".`);
  }

  async getCourseChapterMeta() {
    const rootURL = coursesMetaConfig[this.courseName].root;
    await this.page.goto(rootURL);
    this.page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await this.page.waitForSelector('.course-chapter__items .toc-item');

    const chaptersMeta = await this.page.evaluate(() => {
      const wrapperEls = document.querySelectorAll('.course-chapter__items .toc-item');

      const chaptersMetaL = Array.from(wrapperEls).map((el) => {
        const url = el.href;
        const titleEl = el.querySelector('.toc-item__content');
        const durationEl = el.querySelector('.toc-item__meta .duration');
        const quizEl = el.querySelector('.toc-item__meta .toc-type');

        let title;
        if (titleEl) {
          // eslint-disable-next-line prefer-destructuring
          title = titleEl.innerText.split('\n')[0];
          const titleRegex = /(?<title>\p{ASCII}+)\(In progress\)$/u;
          titleGroups = titleRegex.exec(title);
          if (titleGroups) {
            title = titleGroups.groups.title;
            title = title.trim();
          }
        }
        const duration = durationEl ? durationEl.innerText : '';
        const quiz = quizEl ? quizEl.innerText : '';

        return {
          url,
          title,
          duration,
          quiz,
        };
      });

      return chaptersMetaL;
    });

    coursesMetaConfig[this.courseName].chaptersMeta = chaptersMeta;
  }
}

export default Scraper;

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
