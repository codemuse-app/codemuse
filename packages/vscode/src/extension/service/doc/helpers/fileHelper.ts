import { readFileSync } from 'fs';
/**
 * Removes the last occurrence of a specified character from a given string.
 * 
 * @param inputStr - The string from which the character will be removed.
 * @param charToRemove - The character to be removed. If the character appears 
 *                       multiple times in the string, only its last occurrence 
 *                       will be removed. If the character does not exist in 
 *                       the string, the function will return the original string.
 * @returns A new string with the last occurrence of the specified character removed.
 * 
 * @example
 * removeLastOccurrenceCharacter('hello world', 'd') 
 * // returns 'hello worl'
 */
export function removeLastOccurrenceCharacter(inputStr: string, charToRemove: string): string {
    const reversedStr = inputStr.split('').reverse().join('');
    const modifiedReversedStr = reversedStr.replace(charToRemove, '');
    const modifiedStr = modifiedReversedStr.split('').reverse().join('');
    return modifiedStr;
}

/**
 * Extracts the leading whitespace characters (indentation) from a given line of text.
 * 
 * This function determines the indentation of a line by measuring the difference in 
 * length between the original line and a version of the line with leading whitespace
 * removed (i.e., trimmed from the start). It then returns the substring of the original 
 * line that corresponds to this leading whitespace.
 *
 * @param line - The line of text from which to extract the indentation.
 * @returns A string consisting of the whitespace characters found at the beginning 
 *          of the provided line. If there are no leading whitespace characters, 
 *          an empty string is returned.
 * 
 * @example
 * getIndentationAtLine('    const x = 10;');
 * // returns '    ' (four spaces)
 */
export function getIndentationAtLine(line: string): string {
    const trimmedLine = line.trimStart();
    return line.substring(0, line.length - trimmedLine.length);
}
/**
 * Reads content from a file and optionally returns a specified range of lines.
 * 
 * This function reads the entire content of a file specified by its file path. 
 * If a position range is provided, it returns the content limited to the lines 
 * within this range; otherwise, it returns the entire file content.
 * 
 * @param filePath - The path to the file from which content is to be read.
 * @param position - Optional. A tuple representing the range of lines to be 
 *                   returned. The first element is the starting line number 
 *                   (inclusive), and the second element is the ending line number 
 *                   (exclusive). Line numbers start from 1. If this parameter is 
 *                   omitted, the entire file content is returned.
 * @returns A string containing either the entire file content or the content 
 *          within the specified line range.
 * 
 * @example
 * // Assume 'example.txt' contains:
 * // Line 1
 * // Line 2
 * // Line 3
 * // Line 4
 * // returns 'Line 2\nLine 3\n'
 * getContentInFile('example.txt', [2, 4]);
 */
export function getContentInFile(filePath: string, position?: [number, number]): string {
    const content:string = readFileSync(filePath, 'utf-8');
    if (!position) {
        return content;
    }
    const lines:string[] = content.split('\n')
    const preSubLines:string[] = lines.slice(position[0] - 1, position[1])
    const lastString:string = preSubLines[preSubLines.length - 1];
    const lastChar:string = lastString[lastString.length -1]
    console.log(lastChar)
    console.log("lastChar")
    const subLines = lastChar != "\n" ? preSubLines.concat([""]) : preSubLines ;
    return subLines.join('\n');
}
/**
 * Fin*8as the closest non-empty line of code after a given index in an array of lines.
 * 
 * This function iterates through an array of strings, representing lines of code, starting
 * from a specified index. It searches for the first non-empty line (i.e., a line that is not
 * just whitespace) that occurs after this index. If found, it returns the index of this line
 * and the line itself. If no non-empty line is found after the given index, it returns an 
 * empty string and the length of the lines array.
 *
 * @param index - The starting index from which to search for the next non-empty line.
 * @param lines - An array of strings, each representing a line of code or text.
 * @returns A tuple containing the index of the closest non-empty line and the line itself.
 *          If no non-empty line is found, returns an empty string and the length of the lines array.
 * 
 * @example
 * // Assume 'lines' is an array of strings as follows: ["", " ", "int x = 0;", "return x;"]
 * // returns [2, 'int x = 0;']
 * getClosestUpcomingCodeLine(0, lines);
 */
export function getClosestUpcomingCodeLine(index: number, lines: string[]): [number, string] {
    let nonEmptyClosestLine = "";
    let nonEmptyIndex = index;
    while (nonEmptyIndex < lines.length && !nonEmptyClosestLine) {
        if (lines[nonEmptyIndex].trim() === "") {
            nonEmptyIndex++;
        } else {
            nonEmptyClosestLine = lines[nonEmptyIndex];
        }
    }
    return [nonEmptyIndex, nonEmptyClosestLine];
}
