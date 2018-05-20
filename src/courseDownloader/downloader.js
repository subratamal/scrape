import shell, { exec } from 'shelljs';
import path from 'path';
import {
  EventEmitter
} from 'events';
import {
  jsonReaderSync
} from './../utils';

const coursesMetaConfig = jsonReaderSync(path.resolve('config/courses.json'));

class Downloader extends EventEmitter {
  constructor(courseName) {
    super();
    this.courseName = courseName;
    this.chapterVideoURLs = null;
  }

  getChapterVideoURLs(courseName) {
    const courseNameL = courseName || this.courseName;
    if (!this.chapterVideoURLs) {
      this.chapterVideoURLs = coursesMetaConfig[courseNameL] ? coursesMetaConfig[courseNameL].chapterVideoURLs : {};
    }
    return this.chapterVideoURLs;
  }

  setChapterVideoURLs(chapterVideoURLs) {
    this.chapterVideoURLs = chapterVideoURLs;
  }

  download(url) {
    exec(`curl -o ${url}`)
  }

  downloadAll(urls) {

  }
}

export default Downloader;
