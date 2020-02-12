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

function getRepoDirectory(repoVersion:number): string {
  return "../" + repoName + repoVersion;
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
  options.cwd = getRepoDirectory(version);
  const child = fork(program, parameters, options);
  child.on('message', message => {
    if (message === "update") {
      console.log("Trying to download updates");
      child.kill();
      instantiateNewVersion();
    }
  });
}

function copyProfilesConfig() {
  if(version > 1) {
    let prevProfilesPath = getRepoDirectory(version - 1) + '/settingsProfiles.json'
    let newProfilesPath = getRepoDirectory(version) + '/settingsProfiles.json'
    if(fs.existsSync(prevProfilesPath)) {
      fs.copyFileSync(prevProfilesPath, newProfilesPath)
    }
  }
}

function instantiateNewVersion() {
  version++;
  saveVersion(version);
  git.clone(repoUrl, getRepoDirectory(version)).then(() => {
    console.log("New version downloaded: " + version);
    try {
      exec('npm link express && npm link ws && npm link raspi-serial', { cwd: getRepoDirectory(version) }).on('exit', function (code, _) {
        copyProfilesConfig();
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
