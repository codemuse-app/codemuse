"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileIndexer = void 0;
const path_1 = __importDefault(require("path"));
const ts = __importStar(require("typescript"));
const Counter_1 = require("./Counter");
const Descriptor_1 = require("./Descriptor");
const parseHumanByteSizeIntoNumber_1 = require("./parseHumanByteSizeIntoNumber");
const Range_1 = require("./Range");
const scip = __importStar(require("./scip"));
const ScipSymbol_1 = require("./ScipSymbol");
const ts_inline = __importStar(require("./TypeScriptInternal"));
class FileIndexer {
    constructor(checker, options, input, document, globalSymbolTable, globalConstructorTable, packages, sourceFile) {
        this.checker = checker;
        this.options = options;
        this.input = input;
        this.document = document;
        this.globalSymbolTable = globalSymbolTable;
        this.globalConstructorTable = globalConstructorTable;
        this.packages = packages;
        this.sourceFile = sourceFile;
        this.localCounter = new Counter_1.Counter();
        this.propertyCounters = new Map();
        this.localSymbolTable = new Map();
        this.workingDirectoryRegExp = new RegExp(options.cwd, 'g');
    }
    index() {
        // Uncomment below if you want to skip certain files for local development.
        // if (!this.sourceFile.fileName.includes('constructor')) {
        //   return
        // }
        const byteSize = Buffer.from(this.sourceFile.getText()).length;
        if (this.options.maxFileByteSizeNumber &&
            byteSize > this.options.maxFileByteSizeNumber) {
            const humanSize = (0, parseHumanByteSizeIntoNumber_1.formatByteSizeAsHumanReadable)(byteSize);
            const humanMaxSize = (0, parseHumanByteSizeIntoNumber_1.formatByteSizeAsHumanReadable)(this.options.maxFileByteSizeNumber);
            console.log(`info: skipping file '${this.sourceFile.fileName}' because it has byte size ${humanSize} that exceeds the maximum threshold ${humanMaxSize}. ` +
                'If you intended to index this file, use the flag --max-file-byte-size to configure the maximum file size threshold.');
            return;
        }
        this.emitSourceFileOccurrence();
        this.visit(this.sourceFile);
    }
    emitSourceFileOccurrence() {
        const symbol = this.scipSymbol(this.sourceFile);
        if (symbol.isEmpty()) {
            return;
        }
        this.pushOccurrence(new scip.scip.Occurrence({
            range: [0, 0, 0],
            enclosing_range: Range_1.Range.fromNode(this.sourceFile).toLsif(),
            symbol: symbol.value,
            symbol_roles: scip.scip.SymbolRole.Definition,
        }));
        const moduleName = this.sourceFile.moduleName || path_1.default.basename(this.sourceFile.fileName);
        this.document.symbols.push(new scip.scip.SymbolInformation({
            symbol: symbol.value,
            documentation: ['```ts\nmodule "' + moduleName + '"\n```'],
        }));
    }
    visit(node) {
        if (ts.isConstructorDeclaration(node) ||
            ts.isIdentifier(node) ||
            ts.isPrivateIdentifier(node) ||
            ts.isStringLiteralLike(node)) {
            const sym = this.getTSSymbolAtLocation(node);
            if (sym) {
                this.visitSymbolOccurrence(node, sym);
            }
        }
        ts.forEachChild(node, node => this.visit(node));
    }
    // Get the ts.Symbol corresponding to the current node, potentially de-aliasing
    // the direct symbol to account for imports.
    //
    // This code is directly based off src/services/goToDefinition.ts.
    getTSSymbolAtLocation(node) {
        var _a;
        const rangeNode = ts.isConstructorDeclaration(node)
            ? (_a = node.getFirstToken()) !== null && _a !== void 0 ? _a : node
            : node;
        const symbol = this.checker.getSymbolAtLocation(rangeNode);
        // If this is an alias, and the request came at the declaration location
        // get the aliased symbol instead. This allows for goto def on an import e.g.
        //   import {A, B} from "mod";
        // to jump to the implementation directly.
        if ((symbol === null || symbol === void 0 ? void 0 : symbol.declarations) &&
            symbol.flags & ts.SymbolFlags.Alias &&
            node.kind === ts.SyntaxKind.Identifier &&
            (node.parent === symbol.declarations[0] ||
                ts_inline.shouldSkipAlias(symbol.declarations[0]))) {
            const aliased = this.checker.getAliasedSymbol(symbol);
            if (aliased.declarations) {
                return aliased;
            }
        }
        return symbol;
    }
    hasConstructor(classDeclaration) {
        const cached = this.globalConstructorTable.get(classDeclaration);
        if (cached !== undefined) {
            return cached;
        }
        for (const member of classDeclaration.members) {
            if (ts.isConstructorDeclaration(member)) {
                this.globalConstructorTable.set(classDeclaration, true);
                return true;
            }
        }
        this.globalConstructorTable.set(classDeclaration, false);
        return false;
    }
    visitSymbolOccurrence(node, sym) {
        const range = Range_1.Range.fromNode(node).toLsif();
        let role = 0;
        const isDefinitionNode = isDefinition(node);
        if (isDefinitionNode) {
            role |= scip.scip.SymbolRole.Definition;
        }
        const declarations = ts.isConstructorDeclaration(node)
            ? [node]
            : isDefinitionNode
                ? // Don't emit ambiguous definition at definition-site. You can reproduce
                    // ambiguous results by triggering "Go to definition" in VS Code on `Conflict`
                    // in the example below:
                    // export const Conflict = 42
                    // export interface Conflict {}
                    //                  ^^^^^^^^ "Go to definition" shows two results: const and interface.
                    // See https://github.com/sourcegraph/scip-typescript/pull/206 for more details.
                    [node.parent]
                : (sym === null || sym === void 0 ? void 0 : sym.declarations) || [];
        for (const declaration of declarations) {
            let scipSymbol = this.scipSymbol(declaration);
            let enclosingRange;
            if (scipSymbol.isEmpty() || scipSymbol.isLocal() || !isDefinitionNode) {
                // Skip local symbols
            }
            else if (ts.isVariableDeclaration(declaration) &&
                declaration.initializer) {
                const initializer = declaration.initializer;
                if (ts.isFunctionLike(initializer)) {
                    enclosingRange = Range_1.Range.fromNode(initializer).toLsif();
                }
            }
            else if (ts.isFunctionDeclaration(declaration)) {
                enclosingRange = Range_1.Range.fromNode(declaration).toLsif();
            }
            else if (ts.isClassDeclaration(declaration)) {
                enclosingRange = Range_1.Range.fromNode(declaration).toLsif();
            }
            else if (ts.isMethodDeclaration(declaration)) {
                enclosingRange = Range_1.Range.fromNode(declaration).toLsif();
            }
            else if (ts.isInterfaceDeclaration(declaration)) {
                enclosingRange = Range_1.Range.fromNode(declaration).toLsif();
            }
            if (((ts.isIdentifier(node) && ts.isNewExpression(node.parent)) ||
                (ts.isPropertyAccessExpression(node.parent) &&
                    ts.isNewExpression(node.parent.parent))) &&
                ts.isClassDeclaration(declaration) &&
                this.hasConstructor(declaration)) {
                scipSymbol = ScipSymbol_1.ScipSymbol.global(scipSymbol, (0, Descriptor_1.methodDescriptor)('<constructor>'));
            }
            if (scipSymbol.isEmpty()) {
                // Skip empty symbols
                continue;
            }
            this.pushOccurrence(new scip.scip.Occurrence({
                enclosing_range: enclosingRange,
                range,
                symbol: scipSymbol.value,
                symbol_roles: role,
            }));
            if (isDefinitionNode) {
                this.addSymbolInformation(node, sym, declaration, scipSymbol);
                this.handleShorthandPropertyDefinition(declaration, range);
                this.handleObjectBindingPattern(node, range);
                // Only emit one symbol for definitions sites, see https://github.com/sourcegraph/lsif-typescript/issues/45
                break;
            }
        }
    }
    /**
     * Emits an additional definition occurrence when destructuring an object
     * pattern. For example:
     * ```
     * interface Props { property: number}
     * const props: Props[] = [{ property: 42 }]
     * props.map(({property}) => property) = {a}
     * //          ^^^^^^^^ references `Props.property` and defines a local parameter `property`
     * ```
     */
    handleObjectBindingPattern(node, range) {
        const isObjectBindingPatternProperty = ts.isIdentifier(node) &&
            ts.isBindingElement(node.parent) &&
            ts.isObjectBindingPattern(node.parent.parent);
        if (!isObjectBindingPatternProperty) {
            return;
        }
        const tpe = this.checker.getTypeAtLocation(node.parent.parent);
        const property = tpe.getProperty(node.getText());
        for (const declaration of (property === null || property === void 0 ? void 0 : property.declarations) || []) {
            const scipSymbol = this.scipSymbol(declaration);
            if (scipSymbol.isEmpty()) {
                continue;
            }
            this.pushOccurrence(new scip.scip.Occurrence({
                range,
                symbol: scipSymbol.value,
            }));
        }
    }
    /**
     * Handles the special-case around shorthand property syntax so that we emit two occurrences instead of only one.
     * Shorthand properties need two symbols because they both define a symbol and reference a symbol. For example:
     * ```
     * const a = 42
     * const b = {a}
     * //         ^ both references the local const `a` and defines a new property
     * const c = b.a
     * //          ^ reference to the property `a`, not the local const
     * ```
     */
    handleShorthandPropertyDefinition(declaration, range) {
        if (declaration.kind !== ts.SyntaxKind.ShorthandPropertyAssignment) {
            return;
        }
        const valueSymbol = this.checker.getShorthandAssignmentValueSymbol(declaration);
        if (!valueSymbol) {
            return;
        }
        for (const symbol of (valueSymbol === null || valueSymbol === void 0 ? void 0 : valueSymbol.declarations) || []) {
            const scipSymbol = this.scipSymbol(symbol);
            if (scipSymbol.isEmpty()) {
                continue;
            }
            this.pushOccurrence(new scip.scip.Occurrence({
                range,
                symbol: scipSymbol.value,
            }));
        }
    }
    hideWorkingDirectory(value) {
        return value.replace(this.workingDirectoryRegExp, '');
    }
    addSymbolInformation(node, sym, declaration, symbol) {
        const documentation = [
            '```ts\n' +
                this.hideWorkingDirectory(this.signatureForDocumentation(node, sym)) +
                '\n```',
        ];
        const docstring = sym.getDocumentationComment(this.checker);
        if (docstring.length > 0) {
            documentation.push(ts.displayPartsToString(docstring));
        }
        this.document.symbols.push(new scip.scip.SymbolInformation({
            symbol: symbol.value,
            documentation,
            relationships: this.relationships(declaration, symbol),
        }));
    }
    pushOccurrence(occurrence) {
        if (this.document.occurrences.length > 0) {
            const lastOccurrence = this.document.occurrences[this.document.occurrences.length - 1];
            if (isEqualOccurrence(lastOccurrence, occurrence)) {
                return;
            }
        }
        this.document.occurrences.push(occurrence);
    }
    relationships(declaration, declarationSymbol) {
        const relationships = [];
        const isAddedSymbol = new Set();
        const pushImplementation = (node, isReferences) => {
            const symbol = this.scipSymbol(node);
            if (symbol.isEmpty()) {
                return;
            }
            if (symbol.value === declarationSymbol.value) {
                return;
            }
            if (isAddedSymbol.has(symbol.value)) {
                // Avoid duplicate relationships. This can happen for overloaded methods
                // that have different ts.Symbol but the same SCIP symbol.
                return;
            }
            isAddedSymbol.add(symbol.value);
            relationships.push(new scip.scip.Relationship({
                symbol: symbol.value,
                is_implementation: true,
                is_reference: isReferences,
            }));
        };
        if (ts.isClassDeclaration(declaration)) {
            this.forEachAncestor(declaration, ancestor => {
                pushImplementation(ancestor, false);
            });
        }
        else if (ts.isMethodDeclaration(declaration) ||
            ts.isMethodSignature(declaration) ||
            ts.isPropertyAssignment(declaration) ||
            ts.isPropertyDeclaration(declaration)) {
            const declarationName = declaration.name.getText();
            this.forEachAncestor(declaration.parent, ancestor => {
                var _a;
                for (const member of ancestor.members) {
                    if (declarationName === ((_a = member.name) === null || _a === void 0 ? void 0 : _a.getText())) {
                        pushImplementation(member, true);
                    }
                }
            });
        }
        return relationships;
    }
    scipSymbol(node) {
        var _a, _b, _c;
        const fromCache = this.globalSymbolTable.get(node) || this.localSymbolTable.get(node);
        if (fromCache) {
            return fromCache;
        }
        if (ts.isBlock(node)) {
            return ScipSymbol_1.ScipSymbol.empty();
        }
        if (ts.isSourceFile(node)) {
            const package_ = this.packages.symbol(node.fileName);
            if (package_.isEmpty()) {
                return this.cached(node, ScipSymbol_1.ScipSymbol.anonymousPackage());
            }
            return this.cached(node, package_);
        }
        if (ts.isPropertyAssignment(node) ||
            ts.isShorthandPropertyAssignment(node)) {
            const name = node.name.getText();
            let counter = this.propertyCounters.get(name);
            if (!counter) {
                counter = new Counter_1.Counter();
                this.propertyCounters.set(name, counter);
            }
            return this.cached(node, ScipSymbol_1.ScipSymbol.global(this.scipSymbol(node.getSourceFile()), (0, Descriptor_1.metaDescriptor)(`${node.name.getText()}${counter.next()}`)));
        }
        if (ts.isJsxAttribute(node)) {
            // NOTE(olafurpg): the logic below is a bit convoluted but I spent several
            // hours and failed to come up with a cleaner solution. JSX attributes
            // have custom typechecking rules, as documented here
            // https://www.typescriptlang.org/docs/handbook/jsx.html#type-checking The
            // only way to access the actual symbol we want to reference appears to go
            // through the JSX opening element, which is the grandparent of the JSX
            // attribute node. Through the signature of the opening element, we get
            // the permitted attributes by querying the type of the first parameter.
            const jsxElement = node.parent.parent;
            const props = (_b = (_a = this.checker
                .getResolvedSignature(jsxElement)) === null || _a === void 0 ? void 0 : _a.getParameters()) === null || _b === void 0 ? void 0 : _b[0];
            if (props) {
                try {
                    const tpe = this.checker.getTypeOfSymbolAtLocation(props, node);
                    const property = tpe.getProperty(node.name.text);
                    for (const decl of (property === null || property === void 0 ? void 0 : property.declarations) || []) {
                        return this.scipSymbol(decl);
                    }
                }
                catch {
                    // TODO: https://github.com/sourcegraph/lsif-typescript/issues/34
                    // continue regardless of error, the TypeScript compiler tends to
                    // trigger stack overflows in getTypeOfSymbolAtLocation and we
                    // don't know why yet.
                }
            }
        }
        const owner = this.scipSymbol(node.parent);
        if (owner.isEmpty() || owner.isLocal()) {
            return this.newLocalSymbol(node);
        }
        if (isAnonymousContainerOfSymbols(node)) {
            return this.cached(node, this.scipSymbol(node.parent));
        }
        if (ts.isImportSpecifier(node) ||
            ts.isImportClause(node) ||
            ts.isNamespaceImport(node)) {
            const tpe = this.checker.getTypeAtLocation(node);
            for (const declaration of ((_c = tpe.symbol) === null || _c === void 0 ? void 0 : _c.declarations) || []) {
                return this.scipSymbol(declaration);
            }
        }
        const desc = this.descriptor(node);
        if (desc) {
            return this.cached(node, ScipSymbol_1.ScipSymbol.global(owner, desc));
        }
        // Fallback case: generate a local symbol. It's not a bug when this case
        // happens. For example, we hit this case for block `{}` that are local
        // symbols, which are direct children of global symbols (toplevel
        // functions).
        return this.newLocalSymbol(node);
    }
    newLocalSymbol(node) {
        const symbol = ScipSymbol_1.ScipSymbol.local(this.localCounter.next());
        this.localSymbolTable.set(node, symbol);
        return symbol;
    }
    cached(node, symbol) {
        this.globalSymbolTable.set(node, symbol);
        return symbol;
    }
    descriptor(node) {
        var _a, _b;
        if (ts.isInterfaceDeclaration(node) ||
            ts.isEnumDeclaration(node) ||
            ts.isTypeAliasDeclaration(node)) {
            return (0, Descriptor_1.typeDescriptor)(node.name.getText());
        }
        if (ts.isClassLike(node)) {
            const name = (_a = node.name) === null || _a === void 0 ? void 0 : _a.getText();
            if (name) {
                return (0, Descriptor_1.typeDescriptor)(name);
            }
        }
        if (ts.isFunctionDeclaration(node) ||
            ts.isMethodSignature(node) ||
            ts.isMethodDeclaration(node)) {
            const name = (_b = node.name) === null || _b === void 0 ? void 0 : _b.getText();
            if (name) {
                return (0, Descriptor_1.methodDescriptor)(name);
            }
        }
        if (ts.isConstructorDeclaration(node)) {
            return (0, Descriptor_1.methodDescriptor)('<constructor>');
        }
        if (ts.isPropertyDeclaration(node) ||
            ts.isPropertySignature(node) ||
            ts.isEnumMember(node) ||
            ts.isVariableDeclaration(node)) {
            return (0, Descriptor_1.termDescriptor)(node.name.getText());
        }
        if (ts.isAccessor(node)) {
            const prefix = ts.isGetAccessor(node) ? '<get>' : '<set>';
            return (0, Descriptor_1.methodDescriptor)(prefix + node.name.getText());
        }
        if (ts.isModuleDeclaration(node)) {
            return (0, Descriptor_1.packageDescriptor)(node.name.getText());
        }
        if (ts.isParameter(node)) {
            return (0, Descriptor_1.parameterDescriptor)(node.name.getText());
        }
        if (ts.isTypeParameterDeclaration(node)) {
            return (0, Descriptor_1.typeParameterDescriptor)(node.name.getText());
        }
        if (ts.isTypeReferenceNode(node)) {
            return (0, Descriptor_1.metaDescriptor)(node.typeName.getText());
        }
        if (ts.isTypeLiteralNode(node)) {
            return (0, Descriptor_1.metaDescriptor)('typeLiteral' + this.localCounter.next().toString());
        }
        return undefined;
    }
    signatureForDocumentation(node, sym) {
        var _a;
        const kind = scriptElementKind(node, sym);
        const type = () => this.checker.typeToString(this.checker.getTypeAtLocation(node));
        const asSignatureDeclaration = (node, sym) => {
            var _a;
            const declaration = (_a = sym.declarations) === null || _a === void 0 ? void 0 : _a[0];
            if (!declaration) {
                return undefined;
            }
            return ts.isConstructorDeclaration(node)
                ? node
                : ts.isFunctionDeclaration(declaration)
                    ? declaration
                    : ts.isMethodDeclaration(declaration)
                        ? declaration
                        : undefined;
        };
        const signature = () => {
            const signatureDeclaration = asSignatureDeclaration(node, sym);
            if (!signatureDeclaration) {
                return undefined;
            }
            const signature = this.checker.getSignatureFromDeclaration(signatureDeclaration);
            return signature ? this.checker.signatureToString(signature) : undefined;
        };
        switch (kind) {
            case ts.ScriptElementKind.localVariableElement:
            case ts.ScriptElementKind.variableElement:
                return 'var ' + node.getText() + ': ' + type();
            case ts.ScriptElementKind.memberVariableElement:
                return '(property) ' + node.getText() + ': ' + type();
            case ts.ScriptElementKind.parameterElement:
                return '(parameter) ' + node.getText() + ': ' + type();
            case ts.ScriptElementKind.constElement:
                return 'const ' + node.getText() + ': ' + type();
            case ts.ScriptElementKind.letElement:
                return 'let ' + node.getText() + ': ' + type();
            case ts.ScriptElementKind.alias:
                return 'type ' + node.getText();
            case ts.ScriptElementKind.classElement:
            case ts.ScriptElementKind.localClassElement:
                if (ts.isConstructorDeclaration(node)) {
                    return 'constructor' + (signature() || '');
                }
                return 'class ' + node.getText();
            case ts.ScriptElementKind.interfaceElement:
                return 'interface ' + node.getText();
            case ts.ScriptElementKind.enumElement:
                return 'enum ' + node.getText();
            case ts.ScriptElementKind.enumMemberElement: {
                let suffix = '';
                const declaration = (_a = sym.declarations) === null || _a === void 0 ? void 0 : _a[0];
                if (declaration && ts.isEnumMember(declaration)) {
                    const constantValue = this.checker.getConstantValue(declaration);
                    if (constantValue) {
                        suffix = ' = ' + constantValue.toString();
                    }
                }
                return '(enum member) ' + node.getText() + suffix;
            }
            case ts.ScriptElementKind.functionElement:
                return 'function ' + node.getText() + (signature() || type());
            case ts.ScriptElementKind.memberFunctionElement:
                return '(method) ' + node.getText() + (signature() || type());
            case ts.ScriptElementKind.memberGetAccessorElement:
                return 'get ' + node.getText() + ': ' + type();
            case ts.ScriptElementKind.memberSetAccessorElement:
                return 'set ' + node.getText() + type();
            case ts.ScriptElementKind.constructorImplementationElement:
                return '';
        }
        return node.getText() + ': ' + type();
    }
    // Invokes the `onAncestor` callback for all "ancestors" of the provided node,
    // where "ancestor" is loosely defined as the superclass or superinterface of
    // that node. The callback is invoked on the `node` parameter itself if it's
    // class-like or an interface.
    forEachAncestor(node, onAncestor) {
        const isVisited = new Set();
        const loop = (declaration) => {
            var _a;
            if (isVisited.has(declaration)) {
                return;
            }
            isVisited.add(declaration);
            if (ts.isClassLike(declaration) ||
                ts.isInterfaceDeclaration(declaration)) {
                onAncestor(declaration);
            }
            if (ts.isObjectLiteralExpression(declaration)) {
                const tpe = this.inferredTypeOfObjectLiteral(declaration.parent, declaration);
                for (const symbolDeclaration of ((_a = tpe.symbol) === null || _a === void 0 ? void 0 : _a.declarations) || []) {
                    loop(symbolDeclaration);
                }
            }
            else if (ts.isClassLike(declaration) ||
                ts.isInterfaceDeclaration(declaration)) {
                for (const heritageClause of (declaration === null || declaration === void 0 ? void 0 : declaration.heritageClauses) || []) {
                    for (const tpe of heritageClause.types) {
                        const ancestorSymbol = this.getTSSymbolAtLocation(tpe.expression);
                        if (ancestorSymbol) {
                            for (const ancestorDecl of ancestorSymbol.declarations || []) {
                                loop(ancestorDecl);
                            }
                        }
                    }
                }
            }
        };
        loop(node);
    }
    // Returns the "inferred" type of the provided object literal, where
    // "inferred" is loosely defined as the type that is expected in the position
    // where the object literal appears.  For example, the object literal in
    // `const x: SomeInterface = {y: 42}` has the inferred type `SomeInterface`
    // even if `this.checker.getTypeAtLocation({y: 42})` does not return
    // `SomeInterface`. The object literal could satisfy many types, but in this
    // particular location must only satisfy `SomeInterface`.
    inferredTypeOfObjectLiteral(node, literal) {
        if (ts.isIfStatement(node) ||
            ts.isForStatement(node) ||
            ts.isForInStatement(node) ||
            ts.isForOfStatement(node) ||
            ts.isWhileStatement(node) ||
            ts.isDoStatement(node) ||
            ts.isReturnStatement(node) ||
            ts.isBlock(node)) {
            return this.inferredTypeOfObjectLiteral(node.parent, literal);
        }
        if (ts.isVariableDeclaration(node)) {
            // Example, return `SomeInterface` from `const x: SomeInterface = {y: 42}`.
            return this.checker.getTypeAtLocation(node.name);
        }
        if (ts.isFunctionLike(node)) {
            const functionType = this.checker.getTypeAtLocation(node);
            const callSignatures = functionType.getCallSignatures();
            if (callSignatures.length > 0) {
                return callSignatures[0].getReturnType();
            }
        }
        if (ts.isCallOrNewExpression(node)) {
            // Example: return the type of the second parameter of `someMethod` from
            // the expression `someMethod(someParameter, {y: 42})`.
            const signature = this.checker.getResolvedSignature(node);
            for (const [index, argument] of (node.arguments || []).entries()) {
                if (argument === literal) {
                    const parameterSymbol = signature === null || signature === void 0 ? void 0 : signature.getParameters()[index];
                    if (parameterSymbol) {
                        return this.checker.getTypeOfSymbolAtLocation(parameterSymbol, node);
                    }
                }
            }
        }
        return this.checker.getTypeAtLocation(literal);
    }
}
exports.FileIndexer = FileIndexer;
function isAnonymousContainerOfSymbols(node) {
    return (ts.isModuleBlock(node) ||
        ts.isImportDeclaration(node) ||
        (ts.isImportClause(node) && !node.name) ||
        ts.isNamedImports(node) ||
        ts.isVariableStatement(node) ||
        ts.isVariableDeclarationList(node));
}
function scriptElementKind(node, sym) {
    const flags = sym.getFlags();
    if (flags & ts.SymbolFlags.TypeAlias) {
        return ts.ScriptElementKind.alias;
    }
    if (flags & ts.SymbolFlags.Class) {
        return ts.ScriptElementKind.classElement;
    }
    if (flags & ts.SymbolFlags.Interface) {
        return ts.ScriptElementKind.interfaceElement;
    }
    if (flags & ts.SymbolFlags.Enum) {
        return ts.ScriptElementKind.enumElement;
    }
    if (flags & ts.SymbolFlags.EnumMember) {
        return ts.ScriptElementKind.enumMemberElement;
    }
    if (flags & ts.SymbolFlags.Method) {
        return ts.ScriptElementKind.memberFunctionElement;
    }
    if (flags & ts.SymbolFlags.GetAccessor) {
        return ts.ScriptElementKind.memberGetAccessorElement;
    }
    if (flags & ts.SymbolFlags.SetAccessor) {
        return ts.ScriptElementKind.memberSetAccessorElement;
    }
    if (flags & ts.SymbolFlags.Constructor) {
        return ts.ScriptElementKind.constructorImplementationElement;
    }
    if (flags & ts.SymbolFlags.Function) {
        return ts.ScriptElementKind.functionElement;
    }
    if (flags & ts.SymbolFlags.Variable) {
        if (ts_inline.isParameter(sym)) {
            return ts.ScriptElementKind.parameterElement;
        }
        if (node.flags & ts.NodeFlags.Const) {
            return ts.ScriptElementKind.constElement;
        }
        if (node.flags & ts.NodeFlags.Let) {
            return ts.ScriptElementKind.letElement;
        }
        return ts.ScriptElementKind.variableElement;
    }
    if (flags & ts.SymbolFlags.ClassMember) {
        return ts.ScriptElementKind.memberVariableElement;
    }
    return ts.ScriptElementKind.unknown;
}
function isEqualOccurrence(a, b) {
    return (a.symbol_roles === b.symbol_roles &&
        a.symbol === b.symbol &&
        isEqualArray(a.range, b.range));
}
function isEqualArray(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    for (let index = 0; index < a.length; index++) {
        if (a[index] !== b[index]) {
            return false;
        }
    }
    return true;
}
function declarationName(node) {
    if (ts.isBindingElement(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isEnumMember(node) ||
        ts.isVariableDeclaration(node) ||
        ts.isPropertyDeclaration(node) ||
        ts.isAccessor(node) ||
        ts.isMethodSignature(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isPropertySignature(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isModuleDeclaration(node) ||
        ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node) ||
        ts.isParameter(node) ||
        ts.isTypeParameterDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node)) {
        return node.name;
    }
    return undefined;
}
/**
 * For example:
 *
 * const a = 1
 *       ^ node
 *       ^ node.parent.name
 *       ^^^^^ node.parent
 *
 * function a(): void {}
 *          ^ node
 *          ^ node.parent.name
 * ^^^^^^^^^^^^^^^^^^^^^ node.parent
 */
function isDefinition(node) {
    return (declarationName(node.parent) === node || ts.isConstructorDeclaration(node));
}
