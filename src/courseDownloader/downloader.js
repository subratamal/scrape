import { mkdir, exec } from 'shelljs';
import path from 'path';
import { EventEmitter } from 'events';
import signale from 'signale';
import { snakeCase } from 'change-case';
import { jsonReaderSync } from './../utils';

global.coursesMetaConfig = global.coursesMetaConfig || jsonReaderSync(path.resolve('config/courses.json'));

class Downloader extends EventEmitter {
  constructor(courseName) {
    super();
    this.courseName = courseName;
  }

  getChaptersMeta() {
    return coursesMetaConfig[this.courseName].chaptersMeta;
  }

  // eslint-disable-next-line class-methods-use-this
  async download() {
    const chaptersMeta = this.getChaptersMeta();
    const downloadPromises = chaptersMeta.map((chapterMeta, slNo) => {
      const { videoUrl, title, duration } = chapterMeta;
      return new Promise((resolve, reject) => {
        const downloadPath = path.resolve(`downloads/${snakeCase(this.courseName)}`);
        const fileName = `${slNo.toString().padStart(2, '0')}-${snakeCase(title)} (${duration}).mp4`;
        mkdir('-p', downloadPath);

        exec(`curl -o '${downloadPath}/${fileName}' ${videoUrl}`, (code, stdout, stderr) => {
          signale.success(`Downloaded Chapter: '${title}', of Course: '${this.courseName}' successfully!`);
          resolve(code);
        });
      });
    });

    await Promise.all(downloadPromises);
    signale.success(`Download chapters for ${this.courseName} completed successfully!`);
  }
}

export default Downloader;
