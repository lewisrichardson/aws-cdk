import * as path from 'path';
import { writeFile } from '../files';
import { shell } from '../shell';
import { LoginInformation } from './codeartifact';
import { parallelShell } from './parallel-shell';
import { addToEnvFile } from './usage-dir';

export async function uploadJavaPackages(packages: string[], login: LoginInformation, usageDir: string) {
  const settingsFile = path.join(usageDir, '.m2', 'settings.xml'); // For Maven this will be a fake HOME directory
  await writeMavenSettingsFile(settingsFile, login);

  await parallelShell(packages, async (pkg, output) => {
    // eslint-disable-next-line no-console
    console.log(pkg);

    await shell(['mvn',
      `--settings=${settingsFile}`,
      'deploy:deploy-file',
      `-Durl=${login.mavenEndpoint}`,
      '-DrepositoryId=codeartifact',
      `-DpomFile=${pkg}`,
      `-Dfile=${pkg.replace(/.pom$/, '.jar')}`,
      `-Dsources=${pkg.replace(/.pom$/, '-sources.jar')}`,
      `-Djavadoc=${pkg.replace(/.pom$/, '-javadoc.jar')}`], {
      output,
    });
  },
  (pkg, output) => {
    if (output.toString().includes('409 Conflict')) {
      // eslint-disable-next-line no-console
      console.log(`${pkg} already exists. Skipped.`);
      return true;
    }
    return false;
  });

  // Write env var
  await addToEnvFile(usageDir, 'MAVEN_OPTS', `-Duser.home=${usageDir}`);
}

export async function writeMavenSettingsFile(settingsFile: string, login: LoginInformation) {
  await writeFile(settingsFile, `<?xml version="1.0" encoding="UTF-8" ?>
  <settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
            xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
            xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0
                                http://maven.apache.org/xsd/settings-1.0.0.xsd">
    <servers>
      <server>
        <id>codeartifact</id>
        <username>aws</username>
        <password>${login.authToken}</password>
      </server>
    </servers>
    <profiles>
      <profile>
        <id>default</id>
        <repositories>
          <repository>
            <id>codeartifact</id>
            <url>${login.mavenEndpoint}</url>
          </repository>
        </repositories>
      </profile>
    </profiles>
    <activeProfiles>
      <activeProfile>default</activeProfile>
    </activeProfiles>
  </settings>`);
}