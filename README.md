# VersionUpdater v3.0.3
A CLI to manage version numbers in a project.

![VersionUpdater](http://144.76.103.88/webforge_static/appLogos/versionUpdater.png)

    npm install -g version-updater

While working on a project, it happens to have to change the version number in many files before committing.
This module will automatize the version number updating.

## How it works

Using command **version init** in your project root, it will create a file named *.versionFilesList.json*.<br>
This file contains a list of files where version numbers will be updated (it will not process in any way other files than the ones in the list).<br>
By default the list will contains 4 files: *package.json*, *bower.json*, *README.md*, *index.html* (but these will be included only if they exist in your project folder).

You can add or remove files in any moment by editing *.versionFilesList.json* or using command line options **-a (--add)** and **-r (--remove)** (see below).

*You'll get a warning if the file list is empty (because none of default files and added files exist in the current folder).*

**It will also try to understand your package name and current version from a *package.json* or *bower.json* file.<br>
If you don't have *package.json* or *bower.json* in your project, then you will need to update *.versionFilesList.json* manually with these informations.**

The module will replace version numbers in two different ways, depending on the file type:

- if the file is **json**, it will update the row containing **"version"** keyword

- if the file is **NOT json** it will update all occurrencies of **vX.X.X** where X.X.X is the current version (the use of "v" prefix will avoid to replace version numbers where it is not wanted (ex. in an *```<script>```* inclusion in html file)).<br>
The *"v"* prefix is customizable using option **-p (--prefix)** with command **init** or manually editing *.versionFilesList.json* (see below).

## Commands and Options

syntax: *version [globalOptions] command [commandOptions]*

#### Global Options
- **-V --version**: log versionUpdater's version
- **-h --help**: manual page
- **-d --debug**: activate debug mode with extra console logs

#### Commands
**init**<br>
initializes current folder by creating *.versionFilesList.json*, that contains "filesList" used by versionUpdater to store the list of files to update.

It also try to find a *package.json* or *bower.json* to get package name and currentVersion; if these files does not exist in your project, you will need to fill *.versionFilesList.json* manually with missing informations.

- **-f --force**: forces re-init, deleting and recreating *.versionFilesList.json*
- **-p --prefix**: set the custom version number's prefix used for replace task in non-json files (default *"v"*)
- **-a --add &lt;files&gt;**: specifies one or more files to add to filesList (comma separated)
- **-r --remove &lt;files&gt;**: specifies one or more files to remove from filesList (comma separated); this option is ignored if used together with **-f**
- **--projectName**: manually force the name of current project instead of getting it from *package.json* or *bower.json*
- **--currentVersion**: manually force the current project's version, instead of getting it from *package.json* or *bower.json*


**list**<br>
lists all files currently in filesList (stored in *.versionFilesList.json*).<br>
These are the files in which *versionUpdater* will replace version numbers.

- **--current**: logs also the current version of the project


**update &lt;newVersion&gt;**<br>
updates all files in filesList replacing the currentVersion with "newVersion".
In json files updates the *"version"* line, in other files updates vX.X.X where X.X.X is the currentVersion (as explained above).

(all the following three options are shorthands and are used only if *newVersion* parameter is missing, otherwise they will be ignored)

- **-M --major** [howMany]: increase by [howMany] the major version number (**X+howMany**.0.0); if [howMany] is missing, increase by 1
- **-m --minor** [howMany]: increase by [howMany] the minor version number (x.**X+howMany**.0); if [howMany] is missing, increase by 1
- **-p --patch** [howMany]: increase by [howMany] the patch version number (x.x.**X+howMany**); if [howMany] is missing, increase by 1



### License
Available under <a href="http://opensource.org/licenses/MIT" target="_blank">MIT license</a> (also available in included **license.txt** file).


##### History
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
