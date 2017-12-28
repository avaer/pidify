const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');

const mkdirp = require('mkdirp');
const findProcess = require('find-process');

class Pidify {
  constructor(pidfilePath) {
    this.pidfilePath = pidfilePath;
  }

  getProcess() {
    return new Promise((accept, reject) => {
      fs.readFile(this.pidfilePath, 'utf8', (err, s) => {
        if (!err) {
          const j = _jsonParse(s);

          if (j !== null) {
            const {pid, file, args, opts} = j;
            findProcess('pid', pid)
              .then(list => {
                const basename = path.basename(file);

                if (list.some(l => l.name === basename)) {
                  accept({pid, file, args, opts});
                } else {
                  accept(null);
                }
              })
              .catch(reject);
          } else {
            accept(null);
          }
        } else if (err.code === 'ENOENT') {
          accept(null);
        } else {
          reject(err);
        }
      });
    });
  }

  isRunning() {
    return this.getProcess()
      .then(pid => pid !== null);
  }

  spawn(file, args, opts) {
    return new Promise((accept, reject) => {
      const cp = childProcess.spawn(file, args, opts);
      cp.on('error', reject);

      const {pid} = cp;
      const j = {
        pid,
        file,
        args,
        opts,
      };
      mkdirp(path.dirname(this.pidfilePath), err => {
        if (!err) {
          fs.writeFile(this.pidfilePath, JSON.stringify(j, null, 2), err => {
            cp.removeListener('error', reject);

            if (!err) {
              accept(cp);
            } else {
              reject(err);
            }
          });
        } else {
          reject(err);
        }
      });
    });
  }

  kill(code) {
    return this.getPid()
      .then(pid => {
        if (pid !== null) {
          return process.kill(pid, code);
        } else {
          return Promise.resolve();
        }
      });
  }
}
const _jsonParse = s => {
  try {
    return JSON.parse(s);
  } catch(err) {
    return null;
  }
};

module.exports = (pidfilePath = '/tmp/pidify.pid') => new Pidify(pidfilePath);
