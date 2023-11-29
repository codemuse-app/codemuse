const assert = require("assert")
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
const buildInput = require('packages/vscode/src/extension/service/doc/build_input/build_input');

suite('getComponentBodyAndIndentation Class Test Case', () => {

    test('getComponentBodyAndIndentation for Class', () => {
        // Assuming this is a sample code string containing a class definition
        const sampleCode = `a = 1\n\nclass MyClass:\n    self.att = "test\n    def f():\n    pass`;
        
        const [body, indentation] = buildInput.getComponentBodyAndIndentation("Class", sampleCode);
        
        // Expected body would be from the class definition onwards
        const expectedBody = `    self.att = "test\n    def f():\n    pass`;
        // Assuming the indentation of the first non-empty line after the class is the default indentation
        const expectedIndentation = '    ';  // Adjust based on your function's behavior

        assert.strictEqual(body, expectedBody);
        assert.strictEqual(indentation, expectedIndentation);
    });

    // Additional tests for other component types (Function, Module) can be added similarly
});





