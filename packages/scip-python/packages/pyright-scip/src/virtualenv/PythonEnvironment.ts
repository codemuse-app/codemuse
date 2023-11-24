import * as path from 'path';
import PythonPackage from './PythonPackage';

const pathSepRegex = new RegExp(path.sep, 'g');

export default class PythonEnvironment {
    /// Maps a module name (x.y.z) to an index in this.packages
    private _moduleNameToIndex: Map<string, number>;
    private _filepathToIndex: Map<string, number>;

    constructor(_projectFiles: Set<string>, _projectVersion: string, public packages: PythonPackage[]) {
        this._moduleNameToIndex = new Map();
        this._filepathToIndex = new Map();

        for (let index = 0; index < packages.length; index++) {
            const p = packages[index];
            for (const filepath of p.files) {
                this._filepathToIndex.set(filepath, index);
            }
        }
    }

    public guessPackage(moduleName: string): PythonPackage | undefined {
        let parts = moduleName.split('.');
        let first = parts[0].toLowerCase();
        for (let index = 0; index < this.packages.length; index++) {
            if (first == this.packages[index].name.toLowerCase()) {
                return this.packages[index];
            }
        }

        return undefined;
    }

    public getPackageForModule(moduleName: string): PythonPackage | undefined {
        moduleName = moduleName.toLowerCase();

        // TODO: Could turn these into a Set (normalize all paths, replace with `.`, etc) and then just look this up
        // that is probably worth it as an optimization later.

        let packageIndex = this._moduleNameToIndex.get(moduleName);
        if (!packageIndex) {
            const moduleNameWithInit = moduleName + '.__init__';

            // TODO: This should be formalized much better and I would think this
            // could benefit a lot from some unit tests :) but we'll come back to
            // this and see if there is anything in pyright that could do this
            // for us.
            for (let index = 0; index < this.packages.length; index++) {
                const p = this.packages[index];
                for (let file of p.files) {
                    let normalized = file
                        .slice(0, file.length - path.extname(file).length)
                        .replace(pathSepRegex, '.')
                        .toLowerCase();

                    if (normalized === moduleName || normalized === moduleNameWithInit) {
                        packageIndex = index;
                        break;
                    }
                }

                if (packageIndex) {
                    break;
                }
            }

            if (packageIndex === undefined) {
                packageIndex = -1;
            }

            this._moduleNameToIndex.set(moduleName, packageIndex);
        }

        if (packageIndex === -1) {
            return undefined;
        }

        return this.packages[packageIndex];
    }
}
