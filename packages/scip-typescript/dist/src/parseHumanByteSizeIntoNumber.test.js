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
Object.defineProperty(exports, "__esModule", { value: true });
const uvu_1 = require("uvu");
const assert = __importStar(require("uvu/assert"));
const parseHumanByteSizeIntoNumber_1 = require("./parseHumanByteSizeIntoNumber");
function checkHumanByteSize(humanInput, expectedByteNumber) {
    (0, uvu_1.test)(humanInput, () => {
        const obtained = (0, parseHumanByteSizeIntoNumber_1.parseHumanByteSizeIntoNumber)(humanInput);
        assert.equal(obtained, expectedByteNumber);
    });
}
// Invalid formats
checkHumanByteSize('invalid', NaN);
checkHumanByteSize('15tb', NaN);
checkHumanByteSize('15b', NaN);
// All numeral
checkHumanByteSize('1001', 1001);
// All lowercase
checkHumanByteSize('1.2kb', 1200);
checkHumanByteSize('1.2mb', 1200000);
checkHumanByteSize('1.2gb', 1200000000);
// All uppercase
checkHumanByteSize('1.2KB', 1200);
checkHumanByteSize('1.2MB', 1200000);
checkHumanByteSize('1.2GB', 1200000000);
// Mixed case
checkHumanByteSize('1.2Kb', 1200);
checkHumanByteSize('1.2Mb', 1200000);
checkHumanByteSize('1.2Gb', 1200000000);
