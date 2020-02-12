import simplegit from 'simple-git/promise';
import * as path from 'path';
import { exec, fork, ForkOptions } from "child_process";
import fs from "fs";

function deleteFolderRecursive(path: string) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file: any) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

function getVersion(): number {
  if (fs.existsSync('version.txt')) {
    return Number.parseInt(fs.readFileSync('version.txt').toString());
  } else {
    return 0;
  }
}

function getRepoDirectory(): string {
  return "../" + repoName + version;
}

function saveVersion(version: number) {
  fs.writeFileSync('version.txt', version);
}

let version = getVersion();
const repoName = "coffee";
const repoUrl = "https://github.com/nikitabelotelov/coffee-build.git";
function getServerProgram(): string {
  return path.resolve("../" + repoName + version + '/server.js');
}
const git = simplegit();

const parameters: Array<string> = [];

let options: ForkOptions = {
  stdio: [0, 1, 2, 'ipc']
};

function startServer() {
  const program = getServerProgram();
  console.log('Trying to fork ' + program);
  options.cwd = getRepoDirectory();
  const child = fork(program, parameters, options);
  child.on('message', message => {
    if (message === "update") {
      child.kill();
      instantiateNewVersion();
    }
  });
}

function instantiateNewVersion() {
  version++;
  saveVersion(version);
  git.clone(repoUrl, getRepoDirectory()).then(() => {
    try {
      exec('npm link express && npm link ws && npm link raspi-serial && npm link redux', { cwd: getRepoDirectory() }).on('exit', function (code, _) {
        startServer();
      });
    } catch (e) {
      console.error('Error while running program!');
      console.error(e);
    }
  }, (err) => console.error(err));
}

if (version === 0) {
  instantiateNewVersion();
} else {
  startServer();
}
