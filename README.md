# TypeScript compileOnSave
[https://www.typescriptlang.org/docs/handbook/tsconfig-json.html#compileonsave](compileOnSave)

This extension enables `combileOnSave` property of your `tsconfig.json` file, effectively making TypeScript project a first class citizen in Visual Studio Code environment.

There is no need to create a build task and run it every time you open the project. The extension will find `tsconfig.json` in the workspace and build the project respecting the rules specified in the config.

The extension also works if there is multiple TypeScript projects in a workspace. On top of that, it keeps track of changes in `tsconfig.json` - so that `compileOnSave` could be turned on and off if so desired.

