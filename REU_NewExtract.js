/*
	FILE NAME: 
	Purpose: 
	
	Functions:
	[1] prepare (parameter type(e.g. int)) : 
	[2] parseJSON
	[3] removeDirectory (path) : Recursively deletes a path.
*/

/*
	Input, output, and directory paths
*/
	var tarballDir = "/Users/kalilthenerd/documents/REU/tarballs/";
	var outputFile = "/Users/kalilthenerd/documents/REU/newModel_Summary.csv";
	var scanning = require('./REU_NewScan');
/*
	Global variables
*/
	var Extract = {};
	var errorDest = "";
	var currentDir = tarballDir+"";
		currentDir = currentDir.split("/");
	for(var l=1;l<currentDir.length-2;l++){
		if(l==1){
			errorDest+="/";
		}
		errorDest+=currentDir[l]+"/";
	}
	errorDest+="/failedPackages.txt";
/*
	Required packages and APIs
*/
	var fs = require("fs");

/*
	Functions
*/

Extract.prepare = function(packagePath){
	var versions =  fs.readdirSync(packagePath);
		versions = versions.sort((a, b) => a.replace(/\d+/g, n => +n+100)
                     .localeCompare(b.replace(/\d+/g, n => +n+100)) );
	Extract.parseJSON(packagePath,versions);
};

//Initialize variables to help us distinguish packages that do and do not have a package.JSON file
//Create and fill an array of objects to examine all of the JSON file. 
Extract.parseJSON = function(pkgPath,versions){
	var files= [];
	var errorFiles="";
	var errorFileFound=false;
	
	//CHANGE: FOLDERS.length to FOLDERS.length-1
	for(var i=0; i<versions.length;i++){
		//Avoid the .DS_store file
		if (!versions[i].startsWith('.')) {
		//try to parse the JSON file into a javascript object
			if(!versions[i].startsWith('summary')){
				try{
					var manifestFile = fs.readFileSync(pkgPath + versions[i] +  "/package.json");
					var parsedManifestFile = JSON.parse(manifestFile);
					parsedManifestFile.rootDir = pkgPath + "/" + versions[i];
				} catch (err){
					console.log("This package could not read a .JSON file.");
					errorFiles+=versions[i]+"\n";
					fs.appendFileSync(errorDest,"package.json not found for this file: " + errorFiles);
					return;
				}
				files.push(parsedManifestFile);			
			}
		}
	}
	try{
		var outputStr = scanning.compileInfo(files);
		fs.appendFileSync(outputFile,outputStr);
		console.log("Successfully analyzed.");
	}
	catch(e) {
		console.log("Analysis failed: " + e);
	}
};

Extract.removeDirectory = function(path) {
	var reset=false;
	if (fs.existsSync(path)) {
		reset=true;
		fs.readdirSync(path).forEach(function(file){
		  var curPath = path + "/" + file;
		  if (fs.lstatSync(curPath).isDirectory()) { // recurse
			Extract.removeDirectory(curPath);
		  } else { // delete file
			fs.unlinkSync(curPath);
		  }
		});
		fs.rmdirSync(path);
	  }
};

/*
	Test cases
*/

module.exports = Extract;
