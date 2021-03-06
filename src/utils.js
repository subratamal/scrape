const fs = require('fs');
const signale = require('signale');

module.exports.range = n => Array.from(Array(n).keys());

module.exports.jsonReader = (path) => {
  // eslint-disable-next-line no-new
  new Promise((resolve, reject) => {
    fs.readFile(path, (err, data = {}) => {
      if (err) {
        signale.error(`Error reading (async) from the file ${path}`);
        reject(data);
      } else {
        const obj = JSON.parse(data);
        signale.success(`Data read (async) from the file ${path}`);
        resolve(obj);
      }
    });
  });
};

module.exports.jsonReaderSync = (path, options = {}) => {
  const { silent } = options;
  let data;
  try {
    const json = fs.readFileSync(path, options);
    data = JSON.parse(json);
    signale.success(`Data read (sync) from the file ${path}.`);
  } catch (err) {
    data = {};
    signale.error(`Error reading (sync) from the file ${path}.`);
    if (!silent) {
      throw new Error(err);
    }
  }
  return data;
};

module.exports.jsonWriter = (path, data) => {
  // eslint-disable-next-line no-new
  new Promise((resolve, reject) => {
    const json = JSON.stringify(data, null, '\t');

    fs.writeFile(path, json, (err) => {
      if (err) {
        signale.error(`Error writting (async) to file ${path}`);
        reject(err);
      }
      signale.success(`Data written (async) to the file ${path}`);
      resolve(json);
    });
  });
};

module.exports.jsonWriterSync = (path, data, options = {}) => {
  const { silent } = options;
  try {
    const json = JSON.stringify(data, null, '\t');
    fs.writeFileSync(path, json, options);
    signale.success(`Data written (sync) to the file ${path}.`);
  } catch (err) {
    signale.error(`Error writting (sync) to file ${path}.`);
    if (!silent) {
      throw new Error(err);
    }
  }
};
