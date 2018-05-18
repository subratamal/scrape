const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const shell = require('shelljs');
const signale = require('signale');

let browser = null;
let page = null;
const userDataDir = path.join(__dirname, '../puppeteer-data-dir');

const courses = {
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

// Launching browser instance and creating user profile.
(async () => {
  browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    executablePath: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  });
  signale.info(await browser.version());

  page = await browser.newPage();
  await page.setViewport({
    width: 1500,
    height: 1024,
  });
  await page.setBypassCSP(true);
  await page.goto('https://www.linkedin.com/learning/me', {
    waitUntil: 'networkidle2',
  });

  const chapterUrlsScrape = async (coursesL, courseName, pageNo, pageSize) => {
    const {
      chapters,
    } = coursesL[courseName];
    const sNO = (pageNo * pageSize) < chapters.length ? (pageNo * pageSize) : chapters.length;
    const eNo = ((pageNo + 1) * pageSize) < chapters.length ? ((pageNo + 1) * pageSize) :
      chapters.length;

    const chapterPagesCached = [];
    const videoUrlPromises = chapters.slice(sNO, eNo).map(async (href, idx) => {
      const chapterPage = await (chapterPagesCached[idx] || browser.newPage());
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
    // await console.log(videoUrls);
    return { videoUrls, chapterPagesCached };
  };

  const courseChapterScrapeFn = async (courseName) => {
    const url = courses[courseName].root;
    await page.goto(url);
    // eslint-disable-next-line no-unused-vars
    page.evaluate(_ => window.scrollBy(0, window.innerHeight));
    await page.waitForSelector('.course-chapter__items .toc-item');
    const hrefs = await page.$$eval('.course-chapter__items .toc-item', elems => elems.map(elem => elem.href));
    // console.log(hrefs);
    courses[courseName].chapters = hrefs;
    // const { videoUrls } = await chapterUrlsScrape(courses, courseName, 0, 10);

    const chapterUrlsScrapePromises = [];
    const pageNos = Math.ceil(hrefs.length / config.PAGE_SIZE);
    for (let idx = 0; idx < 2; idx += 1) {
      chapterUrlsScrapePromises.push(chapterUrlsScrape(courses, courseName, idx, config.PAGE_SIZE));
    }

    const videoUrls = await Promise.all(...chapterUrlsScrapePromises);
    signale.success(`Video URLs prepared for Course Name "${courseName}": ${videoUrls.join('\n')}`);
  };

  await courseChapterScrapeFn('node-js-essential-training');

  await browser.close();
})();

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

// await page.evaluate(async () => {
//   debugger;
//   const tmpDownloadAnchor = document.createElement('a');
//   tmpDownloadAnchor.setAttribute('href', 'https://files3.lynda.com/secure/courses/417077/VBR_MP4h264_main_SD/417077_12_01_XR15_nextsteps.mp4?MMbIfDvKTLdnlG1EjMr3m9mgmnJlkBuErsBQZFEWQkvc_4w-gG0GfqhalqMcGbislZo8F_UzszJONRS1lIOSmrpZZ7qI3ADjHYUFiC_VROaMmK340OroWGNaSYZYK6pR2q-BFJ2YQuwNdxq65SiL2VUQYL48Nm_AV8dw4pCjYUYn9LaLqA-9ug');
//   tmpDownloadAnchor.setAttribute('download', 'video.mp4');
//   tmpDownloadAnchor.setAttribute('target', '_blank');
//   tmpDownloadAnchor.innerText = 'Download';

//   const courseAnchor = document.querySelector('a[href="/learning/node-js-essential-training"]');
//   courseAnchor.parentNode.replaceChild(tmpDownloadAnchor, courseAnchor);
//   tmpDownloadAnchor.click();
// });
