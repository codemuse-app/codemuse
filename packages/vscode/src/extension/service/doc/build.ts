const { MultiDirectedGraph } = require('graphology');
import * as buildInput from "./buildInput/buildInput";

import { start } from "repl";
import {
    GraphNode,
    type Graph,
    LocalGraphNode,
    SupportedLanguage,
    Range,
    ExternalGraphNode
  } from "../graph/types";
import { resolveObjectURL } from "buffer";
import { constants } from "crypto";
import { removeLastOccurrenceCharacter } from "./helpers/fileHelper";

  
  const createDummyGraph = () => {
    let graph = new MultiDirectedGraph();
    
    const data = {
        test2:{
          symbol: 'test2',
          range: [0,0,8,0],
          content: 'class MyClass:\n    def __init__(self):\n        self.attribute = 42\n\n    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n    \n',
          file: '/Users/pierredorge/Documents/codemuse-app/codemuse/packages/vscode/src/test/suite/filesForTests/test2.py',
          language: 'python',
          hash: '',
          processedContent:"",
          documentation:""
        },
        MyClass: {
          symbol: 'MyClass',
          range: [0,0,8,0],
          content: 'class MyClass:\n    def __init__(self):\n        self.attribute = 42\n\n    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n',
          file: '/Users/pierredorge/Documents/codemuse-app/codemuse/packages/vscode/src/test/suite/filesForTests/test2.py',
          language: 'python',
          hash: '',
          processedContent:"",
          documentation:""
        },
        __init__: {
            symbol: '__init__',
            range: [1,0,2,0],
            content: '    def __init__(self):\n        self.attribute = 42\n',
            file: '/Users/pierredorge/Documents/codemuse-app/codemuse/packages/vscode/src/test/suite/filesForTests/test2.py',
            language: 'python',
            hash: '',
            processedContent:"",
            documentation:"this is an init function"
        },
        f: {
          symbol: 'f',
          range: [4,0,7,0],
          content: '    def f(self, a):\n        b = a+2\n        print(a)\n        return b\n',
          file: '/Users/pierredorge/Documents/codemuse-app/codemuse/packages/vscode/src/test/suite/filesForTests/test2.py',
          language: 'python',
          hash: '',
          processedContent:"",
          documentation:""
        }
    
      }

      for (const [key, value] of Object.entries(data)) {
        graph.addNode(key, value);
      }
        graph.addDirectedEdge("test2", "MyClass", {
            type: "defines",
            at: [0,0,8,0]
        });
        graph.addDirectedEdge("MyClass", "__init__", {
          type: "defines",
          at: [1,0,2,0]
         });
        graph.addDirectedEdge("MyClass", "f", {
            type: "defines",
            at: [4,0,7,0]
          });
        graph.addDirectedEdge("f", "__init__", {
            type: "uses",
            at: [5,0,5,0]
          });
    
  
        return graph;
    };


  
function inputDefinesChildren(code:string, nodeObject:LocalGraphNode, childrenNodeObjects:Set<LocalGraphNode>):string{
    
    const locationsAndDocumentations: [number,number,string | undefined][] = [...childrenNodeObjects].map((e:LocalGraphNode)=>{
        if (nodeObject.symbol == "scip-python python rtcmd-api-server indexer `server.service.modules.aluminium.api.quote_viewset`/QuoteViewSet#"){
            console.log(e)
            console.log(buildInput.getLineOfSignature(e.content.split("\n")))
        }
        return [e.range[0] + buildInput.getLineOfSignature(e.content.split("\n")) + 1 ,e.range[2],e.documentation]
    })


    //console.log(buildInput.replaceCodeByDocumentation(nodeObject.file, code, locationsAndDocumentations))

    return buildInput.replaceCodeByDocumentation(nodeObject.file, code, locationsAndDocumentations)

}  


function inputUsesChildren(code:string, nodeObject:LocalGraphNode, locationsAndDocumentations:Set<[number,string, string|undefined]>):string{

    if (locationsAndDocumentations.size == 0) {

        return code
    }
    return buildInput.insertDocumentationInCode(code, nodeObject.file, locationsAndDocumentations )
}

export function documentNode(graph:Graph, node:string):string{

    if (graph.getNodeAttributes(node).processedContent){
        return "doc"
    }
    const outBoundEdges:string[] = graph.outboundEdges(node)
    //const numberOfUnvisitedChildren = 0

    //let code = graph.getNodeAttribute()
    //const filePath = graph.getNodeAttribute(node, "file")

    const currentNodeObject = graph.getNodeAttributes(node)

    if(outBoundEdges.length == 0){
        // do the trivial case, documenting without inputing any comments of modifying the code

        graph.setNodeAttribute(node, "processedContent", currentNodeObject.content);
        graph.setNodeAttribute(node, "documentation", node);//build documentation
        
    }else {

        let outBoundDefinesChildren = new Set<LocalGraphNode>()
        let locationsAndDocumentationsUses:Set<[number,string, string|undefined]> = new Set()

        graph.forEachOutboundEdge(node, (_, attr, from, to) => {
            const edgeAttribute = attr

            const type:string = attr.type
            

            const nodeObject:LocalGraphNode = graph.getNodeAttributes(node)
            const toObject:LocalGraphNode = graph.getNodeAttributes(to)

            if (type == "defines"){
                outBoundDefinesChildren.add(toObject)
            }else{
                locationsAndDocumentationsUses.add([edgeAttribute.at[0],toObject.symbol,toObject.documentation])
            }

        })

        let processedContent:string =currentNodeObject.content

        if (outBoundDefinesChildren.size > 0) {
            processedContent = inputDefinesChildren(processedContent, currentNodeObject, outBoundDefinesChildren )
        }
        if (locationsAndDocumentationsUses.size > 0) {
            processedContent = inputUsesChildren(processedContent, currentNodeObject, locationsAndDocumentationsUses )
        }

        graph.setNodeAttribute(node, "processedContent", processedContent);
        graph.setNodeAttribute(node, "documentation", node);//build documentation

    }

    return "doc"

}

function depthFirstDocument(graph:Graph, node:string, resolved = new Set<string>(), unresolved = new Set<string>()):void {
    // Print the node or perform the desired action

    if ( !unresolved.has(node) && !resolved.has(node)){
        unresolved.add(node)
    }

    if( !resolved.has(node)){
        // explore children
        graph.forEachOutboundEdge(node, (_, attr, from, to) => {
            const successor = to

            if(!resolved.has(successor)){
                if(!unresolved.has(successor)){
                    depthFirstDocument(graph, successor, resolved, unresolved)
                }
            }
        })

        documentNode(graph, node)

    }

   
}

export function buildDocumentationsForGraph(graph:Graph){
    const rootNodes = graph.nodes().filter(node=> graph.inDegree(node) === 0);

    let resolved = new Set<string>()
    let unresolved = new Set<string>()

    rootNodes.forEach((rootNode)=>{
        depthFirstDocument(graph, rootNode, resolved, unresolved)
    })

}
  

function updateNode(nodeToUpdate:string, graph:Graph):string{

    let newDocumentation:string = ""
    return newDocumentation
}