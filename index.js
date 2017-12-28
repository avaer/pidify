const fs = require('fs');
const childProcess = require('child_process');

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
                const cmd = [file].concat(args).join(' ');

                if (list.some(l => l.cmd === cmd)) {
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
      fs.writeFile(this.pidfilePath, JSON.stringify(j, null, 2), err => {
        if (!err) {
          accept(j);
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
