"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSnapshot = void 0;
const Range_1 = require("./Range");
const scip_1 = require("./scip");
const packageName = 'scip-typescript typescript';
const commentSyntax = '//';
const formatOptionsPrefix = '// format-options:';
function getSymbolTable(doc) {
    const symbolTable = new Map();
    for (const symbol of doc.symbols) {
        symbolTable.set(symbol.symbol, symbol);
    }
    return symbolTable;
}
function parseOptions(lines) {
    const formatOptions = {
        showDocs: false,
        showRanges: false,
    };
    for (const line of lines) {
        if (!line.startsWith(formatOptionsPrefix)) {
            continue;
        }
        const options = line.slice(formatOptionsPrefix.length).trim().split(',');
        for (const option of options) {
            const optionName = option.trim();
            if (!(optionName in formatOptions)) {
                throw new Error(`Invalid format option: ${optionName}`);
            }
            formatOptions[optionName] = true;
        }
        break;
    }
    return formatOptions;
}
function formatSnapshot(input, doc, externalSymbols = []) {
    const out = [];
    const symbolTable = getSymbolTable(doc);
    const externalSymbolTable = new Map();
    for (const externalSymbol of externalSymbols) {
        externalSymbolTable.set(externalSymbol.symbol, externalSymbol);
    }
    const enclosingRanges = [];
    const symbolsWithDefinitions = new Set();
    const formatOptions = parseOptions(input.lines);
    for (const occurrence of doc.occurrences) {
        const isDefinition = (occurrence.symbol_roles & scip_1.scip.SymbolRole.Definition) > 0;
        if (isDefinition) {
            symbolsWithDefinitions.add(occurrence.symbol);
        }
        if (formatOptions.showRanges && occurrence.enclosing_range.length > 0) {
            enclosingRanges.push({
                range: Range_1.Range.fromLsif(occurrence.enclosing_range),
                symbol: occurrence.symbol,
            });
        }
    }
    enclosingRanges.sort(enclosingRangesByLine);
    const enclosingRangeStarts = Array.from(new Array(input.lines.length), () => []);
    const enclosingRangeEnds = Array.from(new Array(input.lines.length), () => []);
    for (const enclosingRange of enclosingRanges) {
        enclosingRangeStarts[enclosingRange.range.start.line].push(enclosingRange);
        enclosingRangeEnds[enclosingRange.range.end.line].unshift(enclosingRange);
    }
    const emittedDocstrings = new Set();
    const pushDoc = (range, symbol, isDefinition, isStartOfLine) => {
        // Only emit docstrings once
        if (emittedDocstrings.has(symbol)) {
            out.push('\n');
            return;
        }
        // Only definitions OR symbols without a definition should be emitted
        if (!isDefinition && symbolsWithDefinitions.has(symbol)) {
            out.push('\n');
            return;
        }
        emittedDocstrings.add(symbol);
        let prefix = '\n' + commentSyntax;
        if (!isStartOfLine) {
            prefix += ' '.repeat(range.start.character - 2);
        }
        const pushOneDoc = (docs, external) => {
            if (!formatOptions.showDocs) {
                return;
            }
            for (const documentation of docs) {
                for (const [idx, line] of documentation.split('\n').entries()) {
                    out.push(prefix);
                    if (idx === 0) {
                        if (external) {
                            out.push('external ');
                        }
                        out.push('documentation ');
                    }
                    else {
                        out.push('            > ');
                    }
                    out.push(line.slice(0, 40));
                    if (line.length > 40) {
                        out.push('...');
                    }
                }
            }
        };
        const pushOneRelationship = (relationships) => {
            relationships.sort((a, b) => a.symbol.localeCompare(b.symbol));
            for (const relationship of relationships) {
                out.push(prefix);
                out.push('relationship');
                if (relationship.is_implementation) {
                    out.push(' implementation');
                }
                if (relationship.is_reference) {
                    out.push(' reference');
                }
                if (relationship.is_type_definition) {
                    out.push(' type_definition');
                }
                out.push(' ' + relationship.symbol);
            }
        };
        const externalSymbol = externalSymbolTable.get(symbol);
        if (externalSymbol) {
            pushOneDoc(externalSymbol.documentation, true);
            pushOneRelationship(externalSymbol.relationships);
        }
        else {
            const info = symbolTable.get(symbol);
            if (info) {
                pushOneDoc(info.documentation, false);
                pushOneRelationship(info.relationships);
            }
        }
        out.push('\n');
    };
    const pushEnclosingRange = (enclosingRange, end = false) => {
        if (!formatOptions.showRanges) {
            return;
        }
        out.push(commentSyntax);
        out.push(' '.repeat(Math.max(1, enclosingRange.range.start.character - 2)));
        if (enclosingRange.range.start.character < 2) {
            out.push('<');
        }
        else if (end) {
            out.push('^');
        }
        else {
            out.push('⌄');
        }
        if (end) {
            out.push(' end ');
        }
        else {
            out.push(' start ');
        }
        out.push('enclosing_range ');
        out.push(enclosingRange.symbol);
        out.push('\n');
    };
    doc.occurrences.sort(occurrencesByLine);
    let occurrenceIndex = 0;
    for (const [lineNumber, line] of input.lines.entries()) {
        // Write 0,0 items ABOVE the first line.
        //  This is the only case where we would need to do this.
        if (occurrenceIndex === 0) {
            const occurrence = doc.occurrences[occurrenceIndex];
            const range = Range_1.Range.fromLsif(occurrence.range);
            // This is essentially a "file-based" item.
            //  This guarantees that this sits above everything else in the file.
            if (range.start.character === 0 && range.end.character === 0) {
                const isDefinition = (occurrence.symbol_roles & scip_1.scip.SymbolRole.Definition) > 0;
                out.push(commentSyntax);
                out.push(' < ');
                out.push(isDefinition ? 'definition' : 'reference');
                out.push(' ');
                out.push(occurrence.symbol);
                pushDoc(range, occurrence.symbol, isDefinition, true);
                out.push('\n');
                occurrenceIndex++;
            }
        }
        // Check if any enclosing ranges start on this line
        for (const enclosingRange of enclosingRangeStarts[lineNumber]) {
            pushEnclosingRange(enclosingRange);
        }
        out.push('');
        out.push(line);
        out.push('\n');
        while (occurrenceIndex < doc.occurrences.length &&
            doc.occurrences[occurrenceIndex].range[0] === lineNumber) {
            const occurrence = doc.occurrences[occurrenceIndex];
            occurrenceIndex++;
            if (occurrence.symbol === undefined) {
                continue;
            }
            if (occurrence.range.length > 3) {
                throw new Error('not yet implemented, multi-line ranges');
            }
            const range = Range_1.Range.fromLsif(occurrence.range);
            out.push(commentSyntax);
            const isStartOfLine = range.start.character === 0;
            if (!isStartOfLine) {
                out.push(' '.repeat(range.start.character - 2));
            }
            let modifier = 0;
            if (isStartOfLine) {
                modifier = 1;
            }
            const caretLength = range.end.character - range.start.character - modifier;
            if (caretLength < 0) {
                throw new Error(input.format(range, 'negative length occurrence!'));
            }
            out.push('^'.repeat(caretLength));
            out.push(' ');
            const isDefinition = (occurrence.symbol_roles & scip_1.scip.SymbolRole.Definition) > 0;
            out.push(isDefinition ? 'definition' : 'reference');
            out.push(' ');
            const symbol = occurrence.symbol.startsWith(packageName)
                ? occurrence.symbol.slice(packageName.length)
                : occurrence.symbol;
            out.push(symbol.replace('\n', '|'));
            pushDoc(range, occurrence.symbol, isDefinition, isStartOfLine);
        }
        // Check if any enclosing ranges end on this line
        for (const enclosingRange of enclosingRangeEnds[lineNumber]) {
            pushEnclosingRange(enclosingRange, true);
        }
    }
    return out.join('');
}
exports.formatSnapshot = formatSnapshot;
function occurrencesByLine(a, b) {
    return Range_1.Range.fromLsif(a.range).compare(Range_1.Range.fromLsif(b.range));
}
function enclosingRangesByLine(a, b) {
    // Return the range that starts first, and if they start at the same line, the one that ends last (enclosing).
    const rangeCompare = a.range.compare(b.range);
    if (rangeCompare !== 0) {
        return rangeCompare;
    }
    return b.range.end.line - a.range.end.line;
}
