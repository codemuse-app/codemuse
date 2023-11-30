import { getClosestUpcomingCodeLine, getContentInFile, getIndentationAtLine, removeLastOccurrenceCharacter } from "../helpers/fileHelper";
/**
 * Extracts the body of a specified component and its indentation from a string of code.
 *
 * This function analyzes a multiline string of code to find a specific type of
 * component (Class, Function, or Module) and returns the body of the component
 * starting from its declaration and the indentation of the first non-empty line
 * following the component's declaration.
 * 
 * @param {string} componentType - The type of the component to find in the code.
 *                                 Expected values are "Class", "Function", or "Module".
 * @param {string} code - The multiline string of code to analyze.
 * 
 * @returns {[string, string]} A tuple where the first element is the body of the
 *                             component starting from its declaration, and the
 *                             second element is the indentation of the first
 *                             non-empty line following the declaration.
 *                             If the specified component type is not found,
 *                             returns ["", ""].
 *
 * Notes:
 * - For "Module", it returns the entire code with an empty string for indentation.
 * - The function assumes that the code uses consistent indentation and newline characters.
 * - It uses regular expressions to identify the start of Classes and Functions.
 * - The function relies on `getClosestUpcomingCodeLine`, assumed to be defined elsewhere,
 *   to find the closest upcoming non-empty line for indentation calculation.
 */
export function getComponentBodyAndIndentation(componentType:string, code: string): [string, string] {
    const lines = code.split('\n');
    
    for (let index = 0; index < lines.length; index++) {  // JavaScript arrays are 0-indexed
        const line = lines[index].trim();
        // Using a regular expression to match class definition
        let match = false;
        if(componentType == "Class" ){
            match = /^class\s/.test(line);
        }else if(componentType == "Function"){
            match = /^function\s/.test(line);
        }else if(componentType == "Module"){
            return [code, ""]
        }

        if (match) {
            // Assuming getClosestUpcomingCodeLine is defined elsewhere and returns a tuple [number, string]
            const [_, nonEmptyClosestLine] = getClosestUpcomingCodeLine(index+1, lines);

            const result = lines.slice(index+1).join('\n');

            
            const indentation =nonEmptyClosestLine.replace(nonEmptyClosestLine.trimStart(),"");
         
            return [result, indentation];
        }
    }

    return ["", ""];  // Return [null, null] if no matching class definition is found
}

/**
 * Replaces specified sections of code with documentation comments in a given file.
 *
 * This function processes a string of code and replaces specific code sections, as defined
 * in the 'locationsAndDocumentations' array, with corresponding documentation strings. Each
 * documentation string is inserted as a Python-style multiline comment, followed by a 'pass'
 * statement. The function is useful for programmatically adding documentation to code.
 *
 * @param {string} filePath - The path to the file containing the code. This is used to extract
 *                            specific content from the file based on line numbers.
 * @param {string} code - The original code as a string, where the documentation will be inserted.
 * @param {Array<[number, number, string]>} locationsAndDocumentations - An array of tuples. Each
 *                            tuple contains two numbers representing the start and end line
 *                            numbers (1-based indexing) of the code segment to be replaced,
 *                            and a string representing the documentation to be inserted.
 *
 * @returns {string} The modified code string with the documentation comments inserted.
 *
 * Example:
 *  let filePath = 'path/to/code.py';
 *  let originalCode = `def myFunction():\n    a = 1\n    return a\n`;
 *  let locationsAndDocs = [[1, 2, 'This function returns 1.']];
 *  let newCode = replaceCodeByDocumentation(filePath, originalCode, locationsAndDocs);
 *  // newCode now contains the originalCode with the specified section replaced by the documentation.
 */
export function replaceCodeByDocumentation(filePath:string, code: string, locationsAndDocumentations: [[number,number,string]]): string { // note that indexes in locationsAndDocumentations start at 1, first line is 1 not, zero

    let newContent = code

    for (let i = 0; i < locationsAndDocumentations.length ; i++){

        let contentToRemove:string = getContentInFile(filePath, [locationsAndDocumentations[i][0],locationsAndDocumentations[i][1]])
        console.log(contentToRemove)
        console.log("contentToRemove")
        let indentation:string = getIndentationAtLine(getClosestUpcomingCodeLine(0,contentToRemove.split("\n"))[1])
         
        let documentation = locationsAndDocumentations[i][2]

        if(documentation && documentation !== ""){
          
            newContent = newContent.replace(contentToRemove, indentation+'"""'+documentation+'"""\n'+indentation+'pass\n')

        }

    }

    return newContent
}

/**
 * Groups documentation entries by their line index.
 * 
 * This function takes a set of documentation entries and organizes them into a map where each key is a line index,
 * and the value is an array of documentation entries for that line. This grouping facilitates inserting multiple
 * documentation comments at the same line in a code file.
 * 
 * @param {Set<[number, string, string]>} set - A set containing tuples. Each tuple consists of a line index,
 *        a component name, and a documentation string. The line index indicates where the documentation
 *        should be inserted in the code.
 * 
 * @returns {Map<number, Array<[string, string]>>} A map where each key is a line index and the value is an array
 *          of documentation entries (component name and documentation string) to be inserted at that line.
 */
function groupDocumentationsByLineIndex(set:Set<[number,string, string]>):Map<number,Array<[string, string]>> {
    const groupedMap = new Map();

    set.forEach(([index, componentName, documentation]) => {
        if (!groupedMap.has(index)) {
            groupedMap.set(index, []);
        }
        groupedMap.get(index).push([componentName,documentation]);
    });

    return groupedMap;
}

/**
 * Inserts documentation comments into a given code string.
 * 
 * This function dynamically adds documentation comments to specific lines in the code. It handles the case
 * where multiple comments need to be inserted at the same line and ensures each documentation is inserted
 * only once. The function is useful for automatically documenting code with predefined comments.
 * 
 * @param {string} code - The original code string where documentation comments are to be inserted.
 * @param {string} filePath - The file path for the code, used to reference specific lines and content.
 * @param {Set<[number, string, string]>} locationsAndDocumentations - A set of tuples. Each tuple contains
 *        a line number, a component name, and a documentation string, specifying where and what documentation
 *        should be inserted.
 * 
 * @returns {string} The new code string with inserted documentation comments.
 */
export function insertDocumentationInCode(code: string, filePath:string, locationsAndDocumentations: Set<[number,string, string]>): string{

    let alreadyInserted = new Set<[string,string]>([])
    let newCode = code

    const groupedLocationsAndDocumentations = groupDocumentationsByLineIndex(locationsAndDocumentations) // groupes documentations to insert per line where they need to be inserted to handle case with multiple comments to insert

    groupedLocationsAndDocumentations.forEach((documentationsToInsert,index)=>{

        const uniqueDocumentationsToInsert = documentationsToInsert.filter(documentation => !alreadyInserted.has(documentation)) // removes documentations that were already inserted earlier in the code (we are only inserting on the first occurence)

        const codeLineAtIndex = getContentInFile(filePath,[index, index])
        const indentation = getIndentationAtLine(codeLineAtIndex)
        
        if(uniqueDocumentationsToInsert.length > 1){ // case with multiple documentations to insert per line
            let documentationToInsert =  indentation+'"""\n'
            
            uniqueDocumentationsToInsert.forEach(([componentName, documentation]:[string, string])=>{// writes all documentations on top of line with one component per line

                const tempDoc = componentName+": "+documentation
                documentationToInsert+=(indentation+tempDoc+"\n")
                alreadyInserted.add([componentName, documentation])

            })

            const codeLineAtIndexWithDocumentation:string = codeLineAtIndex+documentationToInsert+indentation+'"""\n'
            newCode = newCode.replace(codeLineAtIndex, codeLineAtIndexWithDocumentation)


        }else if(uniqueDocumentationsToInsert.length == 1){ // case with unique documentation to insert per line
            const [componentName,documentation] = uniqueDocumentationsToInsert[0]
            const codeLineAtIndexWithDocumentation:string = removeLastOccurrenceCharacter(codeLineAtIndex,"\n")+" #"+documentation+"\n" //removes last \n occurence to insert documentation at line end
            newCode = newCode.replace(codeLineAtIndex,codeLineAtIndexWithDocumentation)
            alreadyInserted.add([componentName, documentation])
        }


    })

    return newCode

}