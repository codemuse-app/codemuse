"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatByteSizeAsHumanReadable = exports.parseHumanByteSizeIntoNumber = void 0;
const kilo = 1000;
const mega = 1000000;
const giga = 1000000000;
function parseHumanByteSizeIntoNumber(humanByteSize) {
    let value = humanByteSize.toLowerCase();
    let multiplier = 1;
    if (value.endsWith('kb')) {
        multiplier = kilo;
        value = value.slice(0, -2);
    }
    else if (value.endsWith('mb')) {
        multiplier = mega;
        value = value.slice(0, -2);
    }
    else if (value.endsWith('gb')) {
        multiplier = giga;
        value = value.slice(0, -2);
    }
    return Number.parseFloat(value) * multiplier;
}
exports.parseHumanByteSizeIntoNumber = parseHumanByteSizeIntoNumber;
function formatByteSizeAsHumanReadable(byteSize) {
    if (byteSize > giga) {
        return `${byteSize / giga}gb`;
    }
    if (byteSize > mega) {
        return `${byteSize / mega}mb`;
    }
    if (byteSize > kilo) {
        return `${byteSize / kilo}kb`;
    }
    return byteSize.toString();
}
exports.formatByteSizeAsHumanReadable = formatByteSizeAsHumanReadable;
