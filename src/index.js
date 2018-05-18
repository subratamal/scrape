const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const shell = require('shelljs');
const signale = require('signale');
const { range } = require('./utils.js');
const EventEmitter = require('events');

const coursesMetaConfig = {
  'node-js-essential-training': {
    root: 'https://www.linkedin.com/learning/node-js-essential-training',
    chapters: [],
  },
  'learning-react-native-2': {
    root: 'https://www.linkedin.com/learning/learning-react-native-2',
    chapters: [],
  },
};

const config = {
  PAGE_SIZE: 10,
};

class Scrape extends EventEmitter {
  constructor(browser = {}, page = {}) {
    super();
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

  async boot() {
    await this.createBrowser({
      headless: false,
      userDataDir: path.join(__dirname, '../puppeteer-data-dir'),
      executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    });

    await this.createPage({
      width: 1500,
      height: 1024,
      setBypassCSP: true,
    });

    await this.page.goto('https://www.linkedin.com/learning/me', {
      waitUntil: 'networkidle2',
    });

    await this.getCourseChapterMeta('node-js-essential-training');
    await this.getAllChapterURLsForCourse('node-js-essential-training');
  }

  async getChapterURLsForCourse(courseName, options) {
    const {
      coursesMetaConfig,
      pageNo,
      pageSize,
      chapterPagesCached = [],
    } = options;

    const {
      chapters,
    } = coursesMetaConfig[courseName];

    const sNO = (pageNo * pageSize) < chapters.length ? (pageNo * pageSize) : chapters.length;
    const eNo = ((pageNo + 1) * pageSize) < chapters.length ? ((pageNo + 1) * pageSize) : chapters.length;

    const videoUrlPromises = chapters.slice(sNO, eNo).map(async (href, idx) => {
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
    return { videoUrls };
  }

  async getAllChapterURLsForCourse(courseName) {
    const chapterPagesCached = range(config.PAGE_SIZE).map(() => this.browser.newPage());

    const videoUrlsAll = [];
    const { chapters } = coursesMetaConfig[courseName];
    const pageNos = Math.ceil(chapters.length / config.PAGE_SIZE);
    /* eslint-disable no-await-in-loop */
    for (let idx = 0; idx < pageNos; idx += 1) {
      const { videoUrls } = await this.getChapterURLsForCourse(courseName, {
        coursesMetaConfig,
        pageNo: idx,
        pageSize: config.PAGE_SIZE,
        chapterPagesCached,
      });
      videoUrlsAll.push(...videoUrls);
    }

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
    coursesMetaConfig[courseName].chapters = hrefs;
    // const { videoUrls } = await chapterUrlsScrape(coursesMetaConfig, courseName, 0, 10);
  }
}

new Scrape().boot();

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
