import shell from 'shelljs';
import { EventEmitter } from 'events';

class Downloader extends EventEmitter {
  constructor(courseName) {
    super();
    this.courseName = courseName;
  }

  download(url) {

  }

  downloadAll(urls) {

  }
}

// new Downloader("course-name").downloadAll();
