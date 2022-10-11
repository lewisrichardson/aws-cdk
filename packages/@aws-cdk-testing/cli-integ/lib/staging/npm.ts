import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { shell } from '../shell';
import { LoginInformation } from './codeartifact';
import { parallelShell } from './parallel-shell';
import { addToEnvFile } from './usage-dir';

export async function uploadNpmPackages(packages: string[], login: LoginInformation, usageDir: string) {
  // Token goes to home directory, current registry goes in environment
  await writeNpmLoginToken(login.npmEndpoint, login.authToken);

  await parallelShell(packages, async (pkg, output) => {
    // eslint-disable-next-line no-console
    console.log(pkg);

    // path.resolve() is required -- if the filename ends up looking like `js/bla.tgz` then NPM thinks it's a short form GitHub name.
    await shell(['node', require.resolve('npm'), 'publish', path.resolve(pkg)], {
      modEnv: {
        npm_config_registry: login.npmEndpoint,
      },
      show: 'error',
      output,
    });
  }, (pkg, output) => {
    if (output.toString().includes('code EPUBLISHCONFLICT')) {
      // eslint-disable-next-line no-console
      console.log(`${pkg} already exists. Skipped.`);
      return true;
    }
    if (output.toString().includes('code EPRIVATE')) {
      // eslint-disable-next-line no-console
      console.log(`${pkg} is private. Skipped.`);
      return true;
    }
    return false;
  });

  // Add variables to env file
  await addToEnvFile(usageDir, 'npm_config_registry', login.npmEndpoint);
}

async function writeNpmLoginToken(endpoint: string, token: string) {
  const rcFile = path.join(os.homedir(), '.npmrc');
  const lines = (await fs.pathExists(rcFile) ? await fs.readFile(rcFile, { encoding: 'utf-8' }) : '').split('\n');
  const key = `${endpoint.replace(/^https:/, '')}:_authToken=`;

  let found = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(key)) {
      lines[i] = key + token;
      found = true;
      break;
    }
  }
  if (!found) {
    lines.push(key + token);
  }

  await fs.writeFile(rcFile, lines.join('\n'), { encoding: 'utf-8' });
}

// Environment variable, .npmrc in same directory as package.json or in home dir