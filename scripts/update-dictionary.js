const axios = require('axios');
const chalk = require('chalk');
const inquirer = require('inquirer');
const querystring = require('querystring');
const fs = require('fs');
const argv = require('yargs').argv;
const fse = require('fs-extra');
const generateTreeData = require('./generateData');

const constants = require('./constants');

const { schemaPath, versionsFilename, dataFilename, dataFileTreeName } = constants;
const currentVersions = require(versionsFilename);

/* Util Functions */

function ensureDirectoryExistence(path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);
  }
}

function saveFiles(version, data) {
  const dataFile = `${schemaPath}/${version}.json`;
  const treeFile = `${schemaPath}/${version}_tree.json`;
  fse.writeJSONSync(dataFile, data);
  const treeData = generateTreeData(data);
  fse.writeJSONSync(treeFile, treeData);
}

function saveVersionsFile(data) {
  fs.writeFileSync(versionsFilename, JSON.stringify(data));
}

// The data file is the file used on load in the data dictionary.
function saveDataFiles(dictionary, versions, selectedVersion) {
  const content = {
    dictionary,
    versions,
    currentVersion: selectedVersion,
  };
  fse.writeJSONSync(dataFilename, content);
  const treeData = generateTreeData(content.dictionary);
  fse.writeJSONSync(dataFileTreeName, treeData);
}

/* SCRIPT MODES */
async function runAdd(filename) {
  let file =
    filename ||
    (await new Promise((resolve, reject) => {
      inquirer
        .prompt([
          {
            message: 'Enter path and filename for dictionary to add:',
            name: 'filepath',
            type: 'text',
          },
        ])
        .then(answers => {
          const { filepath } = answers;
          resolve(filepath);
        });
    }));

  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

  const selectedVersion = data.version;

  // Ensure we are not overwriting a version that already exists.
  if (currentVersions.includes(selectedVersion)) {
    console.log(
      `The dictionary is version ${selectedVersion}, which already exists in the site. Please update the dictionary file to be a new version not yet used in the site.`,
    );
    console.log(
      `If you are attempting to replace an existing dictionary version, use ${chalk.green(
        'npm run remove',
      )} to remove this version, then run the add script again to add this file.`,
    );
    return;
  }

  currentVersions.push(selectedVersion); // add new version to currentVersions list
  currentVersions.sort((a, b) => b - a); // sort descending

  // Save this content
  await saveVersionsFile(currentVersions);
  saveFiles(selectedVersion, data);

  console.log(`Saved dictionary as version ${selectedVersion}`);
  runSelect();
}

async function runSelect() {
  inquirer
    .prompt([
      {
        message: 'Select version to make default:',
        name: 'version',
        type: 'list',
        choices: currentVersions,
      },
    ])
    .then(answers => {
      const { version } = answers;
      return version;
    })
    .then(async version => {
      const dictionary = JSON.parse(fs.readFileSync(`${schemaPath}/${version}.json`, 'utf-8'));
      await saveDataFiles(dictionary, currentVersions, version);
      console.log(`Version ${version} is now the default.`);
    });
}

async function runRemove() {
  inquirer
    .prompt([
      {
        message: 'Select version to make remove:',
        name: 'version',
        type: 'list',
        choices: currentVersions,
      },
    ])
    .then(answers => {
      const { version } = answers;
      console.log(`Removing version ${version} from the site.`);
      return version;
    })
    .then(async version => {
      currentVersions.splice(currentVersions.indexOf(version), 1);
      await saveVersionsFile(currentVersions);

      const versionFile = `${schemaPath}/${version}.json`;
      const treeFile = `${schemaPath}/${version}_tree.json`;
      try {
        fs.unlinkSync(versionFile);
      } catch (e) {
        // Do nothing
      }
      try {
        fs.unlinkSync(treeFile);
      } catch (e) {
        // Do nothing
      }
      console.log(
        `Version ${version} removed. If this was the default version on the site you should also run ${chalk.green(
          'npm run select',
        )} to set a new default version for the dictionary.`,
      );
    });
}

function runHelp() {
  console.log(`${chalk.yellow('--=')} Data Dictionary Scripts Help ${chalk.yellow('=--')}\n\n`);
  console.log(
    `${chalk.green(
      'node update-dictionary.js <filename>',
    )} \n\t\t- Add a dictionary with the contents in <filename>. This will prompt you to decide if the new dictionary should be the default version.`,
  );
  console.log(
    `${chalk.green(
      'npm run add',
    )} \t- Same as running update-dictionary.js directly, but will prompt you for filename and then execute the script.`,
  );
  console.log(
    `${chalk.green(
      'npm run select',
    )} \t- Prompt will display all available dictionary versions and let you select the one to use as default.`,
  );
  console.log(
    `${chalk.green(
      'npm run remove',
    )} \t- Prompt will display all available dictionary versions and let you remove a version from the site.`,
  );
  console.log('\n');
}

async function run() {
  if (argv.npm) {
    switch (true) {
      case argv.h:
      case argv.help:
        runHelp();
        break;
      case argv.a:
      case argv.add:
        await runAdd();
        break;
      case argv.s:
      case argv.select:
        runSelect();
        break;
      case argv.r:
      case argv.remove:
        runRemove();
        break;
      default:
        console.log(
          `No method selected. How did you get here? Try ${chalk.green('npm run help')}\n`,
        );
    }
  } else {
    const filename = argv.f || argv.file || argv.filename || argv._[0];
    if (!filename) {
      console.log(`No valid arguments provided, available options are:`);
      runHelp();
    } else {
      runAdd(filename);
    }
  }
}

// MAIN!
run();
