#VersionUpdater v1.0.0
A CLI to manage version numbers in a project.

![VersionUpdater](http://144.76.103.88/webforge_static/appLogos/versionUpdaterLogo.png)

    npm install -g version-updater

While working on a project, it happens to have to change version number on many different files before committing.
This module will automatize the version number updating.

##How it works

Using command <b>version init</b> in your project root, it will create a file named <i>versionFilesList.json</i>.<br>
This file contains a list of files where version numbers will be updated (it will not process in any way other files than the ones in the list).<br>
By default the list will contains 4 files: <i>package.json</i>, <i>bower.json</i>, <i>README.md</i>, <i>index.html</i> (but they will be included only if they exists).

You can add or remove files in any moment by editing <i>versionFilesList.json</i> or using command line options <b>-a (--add)</b> and <b>-r (--remove)</b>.

<i>You'll get a warning if the file list is empty (because none of default files and added files exists in the current folder).

<b>It will also try to understand your package name and current version from a <i>package.json</i> or <i>bower.json</i> file.<br>
If you don't have <i>package.json</i> or <i>bower.json</i> in your project, then you will need to update <i>versionFilesList.json</i> manually with these informations.</b>

The module will replace version numbers in two different ways, depending on the file type:

- if the file is <b>json</b>, it will update the row containing <b>"version":</b> keyword

- if the file is <b> NOT json</b> it will update all occurrencies of <b>vX.X.X</b> where X.X.X is the current version (this will avoid to replace version numbers where it is not wanted (ex. in an <i>```<script>```</i> inclusion in html file))

##Commands and Options

syntax: <i>version [globalOptions] command [commandOptions]

####Global Options
- <b>-V --version</b>: log versionUpdater's version
- <b>-h --help</b>: manual page
- <b>-d --debug</b>: activate debug mode with extra console logs

####Commands
<b>init</b><br>
initializes current folder by creating <i>versionFilesList.json</i>, that contains "filesList" used by versionUpdater to store the list of files to update.

It also try to find a <i>package.json</i> or <i>bower.json</i> to get package name and currentVersion; if these files does not exists in your project, you will need to fill <i>versionFilesList.json</i> manually with missing informations.

- <b>-f --force</b>: forces re-init, deleting and recreating <i>versionFilesList.json</i>
- <b>-a --add &lt;files&gt;</b>: specifies one or more files to add to filesList (comma separated)
- <b>-r --remove &lt;files&gt;</b>: specifies one or more files to remove from filesList (comma separated); this option is ignored if used together with <b>-f</b>


<b>update &lt;newVersion&gt;</b><br>
updates all files in fileList replacing the currentVersion with "newVersion".
In json files updates the <i>"version"</i> line, in other files updates vX.X.X where X.X.X is the currentVersion (as explained above).

(all the following three options are shorthands and are used only if <i>newVersion</i> parameter is missing, otherwise will be ignored)

- <b>-M --major</b>: increase by 1 the major version number (<b>X+1</b>.x.x)
- <b>-m --minor</b>: increase by 1 the minor version number (x.<b>X+1</b>.x)
- <b>-p --patch</b>: increase by 1 the patch version number (x.x.<b>X+1</b>)



### License
Available under <a href="http://opensource.org/licenses/MIT" target="_blank">MIT license</a>


##### History
v1.0.0
------
- first version
