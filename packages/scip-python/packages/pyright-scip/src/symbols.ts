import { ParseNode } from 'pyright-internal/parser/parseNodes';
import { Counter } from './lsif-typescript/Counter';
import {
    metaDescriptor,
    methodDescriptor,
    packageDescriptor,
    parameterDescriptor,
    termDescriptor,
    typeDescriptor,
} from './lsif-typescript/Descriptor';
import { ScipSymbol } from './ScipSymbol';
import PythonPackage from './virtualenv/PythonPackage';

let namespaces: Map<string, string> = new Map();

export function setProjectNamespace(packageName: string, projectName: string): void {
    namespaces.set(packageName, projectName);
}

export function makePackage(pythonPackage: PythonPackage): ScipSymbol {
    return ScipSymbol.package(pythonPackage.name, pythonPackage.version);
}

export function makeModule(pythonPackage: PythonPackage, moduleName: string): ScipSymbol {
    let ns = namespaces.get(pythonPackage.name);
    if (ns) {
        moduleName = ns + '.' + moduleName;
    }

    return ScipSymbol.global(makePackage(pythonPackage), packageDescriptor(moduleName));
}

export function makeModuleInit(pythonPackage: PythonPackage, moduleName: string): ScipSymbol {
    let ns = namespaces.get(pythonPackage.name);
    if (ns) {
        moduleName = ns + '.' + moduleName;
    }

    return ScipSymbol.global(
        ScipSymbol.global(makePackage(pythonPackage), packageDescriptor(moduleName)),
        metaDescriptor('__init__')
    );
}

export function makeClass(pythonPackage: PythonPackage, moduleName: string, name: string): ScipSymbol {
    let ns = namespaces.get(pythonPackage.name);
    if (ns) {
        moduleName = ns + '.' + moduleName;
    }

    return ScipSymbol.global(
        ScipSymbol.global(makePackage(pythonPackage), packageDescriptor(moduleName)),
        typeDescriptor(name)
    );
}

export function makeParameter(sym: ScipSymbol, name: string): ScipSymbol {
    return ScipSymbol.global(sym, parameterDescriptor(name));
}

export function makeMeta(sym: ScipSymbol, meta: string): ScipSymbol {
    return ScipSymbol.global(sym, metaDescriptor(meta));
}

export function makeMethod(parent: ScipSymbol, name: string): ScipSymbol {
    return ScipSymbol.global(parent, methodDescriptor(name));
}

export function makeType(parent: ScipSymbol, name: string): ScipSymbol {
    return ScipSymbol.global(parent, typeDescriptor(name));
}

export function makeTerm(parent: ScipSymbol, name: string): ScipSymbol {
    return ScipSymbol.global(parent, termDescriptor(name));
}

export function make(_node: ParseNode, counter: Counter): ScipSymbol {
    return ScipSymbol.local(counter.next());
}
