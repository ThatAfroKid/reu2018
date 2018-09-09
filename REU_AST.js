/*
	FILE NAME: 
	Purpose: 
	
	Functions:
	[1] function(parameter type(e.g. int)) : 
*/

/*
	Input, output, and directory paths
*/
	
/*
	Global variables
*/
	var ASTparser = {};
	var found;
	var notFound;
	var usesFunction;
	var usesEval;

	var fileCounter=0;
/*
	Required packages and APIs
*/
	var fs = require('fs');
	var esprima = require('esprima');
	var walk = require('esprima-walk');

/*
	Functions
*/
ASTparser.gatherAPI = function (inputFilePath,foundArr,notFoundArr) {
	notFound=[];
	usesFunction=false;
	usesEval=false;
	for(var a=0;a<notFoundArr.length;a++){
		notFound.push(notFoundArr[a]);
	}
	if (inputFilePath == undefined && inputFilePath == "") {
  		console.error("Error: no js input file");
		return [foundArr,notFound,usesEval,usesFunction];
	}
	found = foundArr;
	// parse input file
	var ast = ASTparser.parseFile(inputFilePath);
	// WE CONTINUE READING .JS FILES EVEN IF WE CAN'T PARSE ONE. IS THAT OK?
	if(ast == "errorThrown"){
		return [foundArr,notFound,usesEval,usesFunction];
	}
	// analyze AST
	walk(ast, ASTparser.analyzeAST);
	return [found,notFound,usesEval,usesFunction];
};

ASTparser.analyzeAST = function(node) {
	// Note: This function's parameters used to be node, meta
	ASTparser.selectRequire(node);
    ASTparser.selectMetaProgramming(node);
};

ASTparser.analyzeScope = function(globalScope) {
	// implicit declarations
	globalScope.implicit.variables.forEach(function(variable) {
		console.log("globalVariable;" + variable.name + "$implicit");
	});

	// explicit declarations in the global scope
	globalScope.variables.forEach(function(variable) {
		console.log("globalVariable;" + variable.name);
	});
};

ASTparser.selectRequire = function(node) {
  if(node !== undefined){
	  if (node.type === 'CallExpression') {
		if ((node.callee.type === 'Identifier') && (node.callee.name === 'require')) {
		  var requireName = node.arguments[0].value;
		  //console.log("require;" + requireName);
		  for(var a=0; a<notFound.length;a++) {
			  if(requireName==undefined){
				  break;
			  }
			  if(notFound[a] == requireName.toUpperCase()){
				  //console.log("FOUND: " + notFound[a] + "=" + requireName.toUpperCase());
				  found.push(notFound[a]);
			  }
		  }
		}
	  }
  }
};

ASTparser.selectMetaProgramming = function(node) {
	if(node !== undefined){
	  if (node.type === 'CallExpression') {
		if ((node.callee.type === 'Identifier') && (node.callee.name === 'eval')) {
		  usesEval=true;
		}  
	  }
	  if (node.type === 'NewExpression') {
		if ((node.callee.type === 'Identifier') && (node.callee.name === 'Function')) {
		  usesFunction=true;
		}
	  }
	}
  /*
  	Include Prototype in here
  */
};

ASTparser.parseFile = function(filePath) {
  try {  
    var data = fs.readFileSync(filePath, 'utf8');
    data = data.split('#!/usr/bin/env node').join("");

    var ast = esprima.parseModule(data, { loc : true });
    return ast;
  } catch(e) {
    return "errorThrown";
  }
};


// analyze variables scope
//var scopeManager = eslintScope.analyze(ast);
//analyzeScope(scopeManager.globalScope);


/*var obj = {};
obj.type = 'CallExpression';
obj.callee = "";
obj.callee.type = 'Identifier';
obj.callee.name = 'require';
obj.arguments=["boop"];
obj.arguments[0].value = "http";
selectRequire(obj);*/

/*
	Test cases
*/

module.exports = ASTparser;
// eslint - scope manager
//var eslintScope = require('eslint-scope');
