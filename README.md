# VersionUpdater v5.7.11
A CLI to manage version numbers in a project.

![VersionUpdater](http://files.web-forge.info/logos/versionUpdater.png)

    npm install -g version-updater

While working on a project, it happens to have to change the version number in many files before committing.
This module will automatize the version number updating.


## How it works

Using command **version init** in your project root, it will create a file named *.versionFilesList.json*.<br>
This file contains a list of files where version numbers will be updated (it will not process in any way other files than the ones in the list).<br>
By default the list will contains 4 files: *package.json*, *bower.json*, *README.md*, *index.html* (but these will be included only if they exist in your project folder).

You can add or remove files in any moment by editing *.versionFilesList.json* or using command line options **-a (--add)** and **-r (--remove)** (see below).

    version init -a <fileName[:fileType]>

The *fileType* is optional; if you add a file without specifying a *fileType*, it will be added following the module's conventions (read below).

*You'll get a warning if the file list is empty (because none of default files and added files exist in the current folder).*

**It will also try to understand your package name and current version from one of the followings:  

- package.json
- bower.json
- package.js

If you don't have any of these in your project, then you will need to update *.versionFilesList.json* manually with these informations.**

### File types

There are currently 2 supported file types: **package** and **normal**.

The module will replace version numbers in two different ways, depending on the file type:

- **PACKAGE FILES**: if the file is a **package file**, it will update the row containing **"version"** keyword (json files are automatically added as **package files** if the type is not explicitly specified)

- **NORMAL FILES**: if the file is **NOT json** or **NOT explicitly added as a package file** it will update all occurrencies of **vX.X.X** where X.X.X is the current version (the use of "v" prefix will avoid to replace version numbers where it is not wanted (ex. in an *```<script>```* inclusion in html file)).<br>
The *"v"* prefix is customizable using option **-p (--prefix)** with command **init** or manually editing *.versionFilesList.json* (see below).
(Any file that has not a ".json" extension or "package" type explicitly set is added as a normal file).

## Commands and Options

syntax: *version [globalOptions] command [commandOptions]*

Use *version* (without any argument) to output just the current project's version.

#### Global Options
- **-V --version**: log versionUpdater's version
- **-h --help**: manual page
- **-d --debug**: activate debug mode with extra console logs

## Commands
## **init**<br>
initializes current folder by creating *.versionFilesList.json*, that contains "filesList" used by versionUpdater to store the list of files to update.

It also tries to find a *package.json* or *bower.json* to get package name and currentVersion; if these files does not exist in your project, you will need to fill *.versionFilesList.json* manually with missing informations.

- **-f --force**: forces re-init, deleting and recreating *.versionFilesList.json*
- **-p --prefix**: set the custom version number's prefix used for replace task in non-json files (default *"v"*)
- **-a --add &lt;files&gt;**: specifies one or more files to add to filesList (comma separated).

The files to be added can have an optional fileType that tells the module how to update the version number in it (as explained above);

The following examples illustrate how to import any file as any type you want, even if normally you just add files without specifying any fileType, since the module conventions suit most needs.

    version init -a <fileName[:fileType]>

    // json files
    // the following two lines have the same effect (import as a package file):
    version init -a package.json
    version init -a package.json:package

    // while this will import the file as a normal file
    version init -a package.json:normal

    // non-json files
    // in the same way the following two will both import as a normal file:
    version init -a release-notes.txt
    version init -a release-notes.txt:normal

    // while this will import as a package
    version init -a release-notes.txt:package

- **-r --remove &lt;files&gt;**: specifies one or more files to remove from filesList (comma separated); this option is ignored if used together with **-f**
- **--projectName**: manually force the name of current project instead of getting it from *package.json* or *bower.json*
- **--currentVersion**: manually force the current project's version, instead of getting it from *package.json* or *bower.json*


## **list**<br>
lists all files currently in filesList (stored in *.versionFilesList.json*).<br>
These are the files in which *versionUpdater* will replace version numbers.

- **--current**: logs also the current version of the project


## **update &lt;newVersion&gt;**<br>
updates all files in filesList replacing the currentVersion with "newVersion".
In json files updates the *"version"* line, in other files updates vX.X.X where X.X.X is the currentVersion (as explained above).

(all the following three options are shorthands and are used only if *newVersion* parameter is missing, otherwise they will be ignored)

- **-M --major** [howMany]: increase by [howMany] the major version number (**X+howMany**.0.0); if [howMany] is missing, increase by 1
- **-m --minor** [howMany]: increase by [howMany] the minor version number (x.**X+howMany**.0); if [howMany] is missing, increase by 1
- **-p --patch** [howMany]: increase by [howMany] the patch version number (x.x.**X+howMany**); if [howMany] is missing, increase by 1
- **--analyze**: search for mismatched version numbers in files while updating
- **--verbose**: (to be used with `--analyze`) logs to screen the lines containing wrong version numbers
- **--fix**: (to be used with `--analyze`) replace wrong version numbers found with the current one


## UPGRADE WARNING

Version 3.10.1 introduces the **fileType** support (please read below);
if you are already using a previous version of this module, all your files in your **.versionFilesList.json** will be interpreted as **normal files**.
To avoid this you can add ":package" next to the name of your json files in your **.versionFilesList.json** or remove and add them again (in this case the fileType will be automatically added as "package" for json files); new **.versionFilesList.json** structure:

    {
        "name": "web-app",
        "currentVersion": "3.12.85",
        "versionPrefix": "v",
        "filesList": [
            "package.json:package",       // package file!
            "bower.json:package",         // package file!
            "config/environment.js",
            "README.md"
        ]
    }




### License
Available under <a href="http://opensource.org/licenses/MIT" target="_blank">MIT license</a> (also available in included **license.txt** file).


## History
3.14.3
------
- added support for package.js (meteor.js packages package-file);

3.13.0
------
- added support for `--analyze` and `--fix` multiple wrong version numbers in the same line

3.12.15
-------
- improved console logs for `--analyze` option

3.12.3
------
- added `--analyze` functionality to search for mismatched version numbers
- added `--fix` functionality to fix wrong version numbers
- improved console logs readability

3.11.0
------
- added analyze option
- added verbose option for analyze

3.10.2
------
- added file type support during init

3.10.1
------
- added support for *fileTypes*
- added auto-detec file type function

3.0.8
-----
- added check for already added files when using "init -a" command

3.0.5
-----
- added simple print of current project's version when used without arguments

3.0.3
-----
- added "--projectName" and "--currentVersion" options to "init" command

3.0.1
-----
- fixed missing message on configuration file update

3.0.0
-----
The configuration file format has changed, but versionUpdater will automatically rebuild it from the existing one
- changed configuration file to hidden file (better for use with frameworks like meteor)
- added support for increment more than 1 at once

2.0.4
-----
- fixed log grammar

2.0.3
-----
- added custom version prefix for non-json files
- added list command
- version auto-increment bug fixes

1.0.1
-----
- auto-add versionFilesList.json to .gitignore if exists

1.0.0
-----
- first version
