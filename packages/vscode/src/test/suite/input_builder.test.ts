import * as assert from "assert";
import * as buildInput from "../../extension/service/doc/buildInput/buildInput";
import * as fileHelper from "../../extension/service/doc/helpers/fileHelper";

suite("getComponentBodyAndIndentation Class Test Case", () => {
  test("getComponentBodyAndIndentation for Class", () => {
    // Assuming this is a sample code string containing a class definition
    const sampleCode = `a = 1\n\nclass MyClass:\n    self.att = "test\n    def f():\n        pass`;

    const [body, indentation] = buildInput.getComponentBodyAndIndentation(
      sampleCode
    );

    // Expected body would be from the class definition onwards
    const expectedBody = `    self.att = "test\n    def f():\n        pass`;
    // Assuming the indentation of the first non-empty line after the class is the default indentation
    const expectedIndentation = "    "; // Adjust based on your function's behavior

    assert.strictEqual(body, expectedBody);
    assert.strictEqual(indentation,expectedIndentation);
  });
  test("getComponentBodyAndIndentation for Function", () => {
    // Sample code string containing a function definition
    const sampleCode = `let a = 1;\n\ndef myFunction() {\n    let b = 2;\n    return a + b;\n}`;

    const [body, indentation] = buildInput.getComponentBodyAndIndentation(
      sampleCode
    );

    // Expected body would be from the function definition onwards
    const expectedBody = `    let b = 2;\n    return a + b;\n}`;
    // Assuming the indentation of the first non-empty line after the function is the default indentation
    const expectedIndentation = "    "; // Adjust based on your function's behavior

    assert.strictEqual(body, expectedBody);
    assert.strictEqual(indentation, expectedIndentation);
    });

  // Additional tests for other component types (Function, Module) can be added similarly
});


suite("replaceCodeByDocumentation Class Test Case", () => {
    test('Replace documentation in Class', () => {
        const sampleCode = `class MyClass:\n    def __init__(self):\n        self.attribute = 42\n`;
        const locationsAndDocumentationsTest: [[number,number,string]] = [[1, 2, 'This is a class.']];

        const newContent = buildInput.replaceCodeByDocumentation(
            __dirname.replace("out/","src/")+'/filesForTests/test.py',
            sampleCode,
            locationsAndDocumentationsTest
        );
        console.log(newContent)
        console.log("newContent")
        const expectedContent = `class MyClass:\n    """This is a class."""\n    pass\n`;
        assert.strictEqual(newContent, expectedContent);
    });

    test('Replace documentation in Function', () => {
        const sampleCode = "    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n"

        const locationsAndDocumentationsTest: [[number,number,string]] = [[5, 7, 'This is a function.']];

        const newContent = buildInput.replaceCodeByDocumentation(
            __dirname.replace("out/","src/")+'/filesForTests/test2.py',
            sampleCode,
            locationsAndDocumentationsTest
        );
        console.log(newContent)
        console.log("newContent")
        const expectedContent = `    def f(self, a):\n        """This is a function."""\n        pass\n`;
        assert.strictEqual(newContent, expectedContent);
    });
    test('removeLastOccurenceCharacter Test', () => {
        const inputStr = "    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n"
        
        const result =  fileHelper.removeLastOccurrenceCharacter(inputStr, "\n")  
        assert.strictEqual(result,"    def f(self, a):\n        b = a+2\n        print(a)\n        return b");

    });

    test('getContentInFile singleline', () => {

        const result = fileHelper.getContentInFile(
            __dirname.replace("out/","src/")+'/filesForTests/test2.py',
            [5,5]
        );
        assert.strictEqual(result, "        b = a+2\n");
    });

    test('getContentInFile multiple lines', () => {

        const result = fileHelper.getContentInFile(
            __dirname.replace("out/","src/")+'/filesForTests/test2.py',
            [5,7]
        );
        assert.strictEqual(result, "        b = a+2\n        print(a)\n        return b\n");
    });

    // test('getContentInFile multiple lines with jump in the end', () => {

    //     const result = fileHelper.getContentInFile(
    //         __dirname.replace("out/","src/")+'/filesForTests/test2.py',
    //         [5,8]
    //     );
    //     assert.strictEqual(result, "        b = a+2\n        print(a)\n");
    // });

    test('Insert documentation in Function single line', () => {
        const sampleCode = "    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n"

        const locationsAndDocumentationsTest: Set<[number,string, string]> = new Set([[5,"Test", 'Test Comment']]);

        const newContent = buildInput.insertDocumentationInCode(
            sampleCode,
            __dirname.replace("out/","src/")+'/filesForTests/test2.py',
            locationsAndDocumentationsTest
        );
        console.log(newContent)
        console.log("newContent")
        const expectedContent = "    def f(self, a):\n        b = a+2 #Test Comment\n        print(a)\n        return b\n"
        assert.strictEqual(newContent, expectedContent);
    });

    test('Insert documentation in Function nultiple single lines', () => {
        const sampleCode = "    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n"

        const locationsAndDocumentationsTest: Set<[number,string, string]> = new Set([[5,"Test", 'Test Comment'], [6,"Test 2", 'Test Comment 2'] ]);

        const newContent = buildInput.insertDocumentationInCode(
            sampleCode,
            __dirname.replace("out/","src/")+'/filesForTests/test2.py',
            locationsAndDocumentationsTest
        );
        console.log(newContent)
        console.log("newContent")
        const expectedContent = "    def f(self, a):\n        b = a+2 #Test Comment\n        print(a) #Test Comment 2\n        return b\n"
        assert.strictEqual(newContent, expectedContent);
    });

    test('Insert documentation in Function nultiple comments in a single line', () => {
        const sampleCode = "    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n"

        const locationsAndDocumentationsTest: Set<[number,string, string]> = new Set([[5,"Test", 'Test Comment'], [5,"Test 2", 'Test Comment 2'] ]);

        const newContent = buildInput.insertDocumentationInCode(
            sampleCode,
            __dirname.replace("out/","src/")+'/filesForTests/test2.py',
            locationsAndDocumentationsTest
        );
        const expectedContent = '    def f(self, a):\n        b = a+2\n        """\n        Test: Test Comment\n        Test 2: Test Comment 2\n        """\n        print(a)\n        return b\n'
        assert.strictEqual(newContent, expectedContent);
    });

    test('Test getLineOfSignature', () => {
        const sampleCode = "@atomic\n    def create(self, request):\n\n        error = check_permission(request.user,\"rtcmdmodels.add_request\")\n        if error:\n            return error\n\n        try:\n            data = request.data\n            quote = QuoteView(obj=data, requestor=request.user)\n            quote.save_to_db()\n\n            for t in data.get(\"trades\"):\n\n                maturity_model = Maturity.objects.get(id=t.get(\"maturity\"))\n                request_maturity_model, created_request_instrument = RequestMaturity.objects.get_or_create(\n                    request=quote.db_object, maturity=maturity_model)\n\n                for i in data.get(\"instruments\"):\n                    instrument_model = Instrument.objects.get(name=i)\n                    trade = AluTradeView(obj=t, instrument=instrument_model, request_maturity=request_maturity_model,\n                                         trade_action=TradeActions.REQUEST_ADDED.value)\n                    trade.save_to_db()\n\n            add_plant_details(quote.db_object, data.get('plant_details', []))\n            serialized_data = LightRequestSerializer(quote.db_object)\n            send_request_create(serialized_data.data)\n\n\n            \n            title = \"New \" + str(quote.db_object.request_type) + \" #\" + str(quote.db_object.id) +\" for \" + str(quote.db_object.customer.name) +\" for \" + str(quote.db_object.total_quantity) +\" MT\"\n\n            notify_alu(\"\", title, 'View Request', '/request/'+str(quote.db_object.id)+\"/details\", receiver_type=\"TRADER\", request=quote.db_object )\n            \n\n            return Response({'id': serialized_data.data['id'], 'type': serialized_data.data['request_type']}, status=200)\n\n        except ValidationError as e:\n            return Response({\"error\": e}, status=400)\n        except Maturity.DoesNotExist:\n            return Response({\"error\":\"Maturity not found in database\"},status = 400)\n        except Instrument.DoesNotExist:\n            return Response({\"error\":\"Instrument not found in database\"},status = 400)"

        assert.strictEqual(1, buildInput.getLineOfSignature(sampleCode.split("\n")));
    });
    // Additional tests for other component types (Function, Module) can be added similarly
  });
  