import shell, { exec } from 'shelljs';
import path from 'path';
import { EventEmitter } from 'events';
import signale from 'signale';
import { jsonReaderSync } from './../utils';

const coursesMetaConfig = jsonReaderSync(path.resolve('config/courses.json'));

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
    const downloadPromises = chaptersMeta.map((chapterMeta) => {
      const { videoUrl, title } = chapterMeta;
      return new Promise((resolve, reject) => {
        exec(`curl -o ${path.resolve('downloads/video.mp4')} ${videoUrl}`, (code, stdout, stderr) => {
          signale.success(`Downloaded ${title} successfully!`);
          resolve(code);
        });
      });
    });

    await Promise.all(downloadPromises);
    signale.success(`Download chapters for ${this.courseName} completed successfully!`);
  }
}

export default Downloader;
