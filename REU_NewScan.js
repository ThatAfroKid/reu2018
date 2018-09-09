/*
	FILE NAME: 
	Purpose: 
	
	Functions:
	[1] function(parameter type(e.g. int)) : 
	[2] 
	[3] 
	[4] 
	[5] 
	[6] 
	[7] 
	[8] 
	[9] 
	[10] 
	[11] 
	[12] 
	[13] 
	[14] 
	[15]
	[16]
*/

/*
	Input, output, and directory paths
*/
	var AST = require('./REU_AST');
	// APIS = HTTP,HTTPS,HTTP2,NET,FS,CHILD_PROCESS;
/*
	Global variables
*/
	var Scanning = {};
/*
	Required packages and APIs
*/
	var walk = require('walk');
	var fs = require("fs");

/*
	Functions
*/

// -------------------------------------------------- Functions ----------------------------------------------------
// Function: This is the primary function. It collects a string of important information gathered from packages and writes it to a comma seperated file. 
// !!!!!!!!!! UPDATE THIS !!!!!!!!!!!! Function: This function compiles all of the information we have deemed as important: name, version, updateType, # of dep, # of deps added, # of deps removed
Scanning.compileInfo = function(pkgArray) {
	var pkgInfoStr = "";
	var outputStr = "";
	//var outputStr = "Name,Version,UpdateType,HTTP,HTTPS,HTTP2,NET,FS,CHILD_PROCESS,isNewAPI,EvalUsed,introducedEval,FunctionUsed,introducedFunction,isNewJSFile,isNewCoffeeFile,isNewDependency,ExtDep,HookupPresent,newHookup";

	var firstPackageParsed=false;
	for (var j=0; j < pkgArray.length; j++) {
		// ?? Why would a package folder be undefined? Files should only include defined files. ??
		try{
			if (pkgArray[j] !== undefined) { 
				//Collect all of the files ending in .js and .coffee in two seperate lists
				var filesArr = Scanning.sourceCodeFiles(pkgArray[j]);
				pkgArray[j].jsFiles=filesArr[0];
				pkgArray[j].coffeeFiles=filesArr[1];
				var previousJSFiles;
				try{previousJSFiles=Scanning.sourceCodeFiles(pkgArray[j-1]);}
				catch(err){previousJSFiles=["NA"];}
				// count js LOC for js files
				var jsFiles=pkgArray[j].jsFiles;
				//console.log(Scanning.name(pkgArray[pkgArray.length-1]) + " VERSION: "+Scanning.version(pkgArray[j]));
				// count js LOC for js files
				//var coffeeFiles=pkgArray[j].coffeeFiles;
				
				//Characteristics: Name,Version,UpdateType,http_used,https_used,http2_used,net_used,fs_used,childProcess_used,newAPI,firstEval,firstFunction,newJS,newCoffee,newDependencies,depPresent,hookupsPresent,hookupsAdded
				try{
					pkgInfoStr = Scanning.name(pkgArray[pkgArray.length-1]) + "," + 
							 Scanning.version(pkgArray[j]) + "," + 
							 Scanning.updateType(pkgArray[j], pkgArray[j-1]) + "," +
							 Scanning.apiUsage(jsFiles,j,previousJSFiles[0]) + "," + //ERROR: cannot read property 2 of undefined
							 Scanning.fileChanges(pkgArray[j],pkgArray[j-1],0,firstPackageParsed) + "," +
							 Scanning.fileChanges(pkgArray[j],pkgArray[j-1],1,firstPackageParsed) + "," +
							 Scanning.fileChanges(pkgArray[j],pkgArray[j-1],2,firstPackageParsed) + "," +
							 Scanning.examineJS(jsFiles,pkgArray[j]) + "," +
							 Scanning.hookupScripts(pkgArray[j],pkgArray[j-1],j) + "\n"; //ERROR: null or undefined object;
				}
				catch(hands){
					console.log("Characteristic collection failed: " + hands);
				}
							 //jsFiles.length + "," + 
							 //coffeeFiles.length + "," + 
							 //Scanning.countDep(pkgArray[j]) + "," + 
				//
				outputStr += pkgInfoStr;
				firstPackageParsed=true;
			}
		}
		catch(err) {
			console.log("Scanning error: " + err);
		}
	}
	return outputStr;
}

// for each file: open file (fs.readSync) and count lines of code
// Function: Recursively scan all files in a directory and return the number of .js and .coffee files

Scanning.sourceCodeFiles = function(pkg) {
  "use strict";
  var rootDir = pkg.rootDir;
	
  var jsFiles2 = [];
  var coffeeFiles2 = [];
  (function() {	
	  var walker;
	  
	  var options = {
		listeners: {
		  names: function (root, nodeNamesArray) {
			nodeNamesArray.sort(function (a, b) {
			  if (a > b) return 1;
			  if (a < b) return -1;
			  return 0;
			});
      }
    , directories: function (root, dirStatsArray, next) {
        next();
      }
    , file: function (root, fileStats, next) {
        if (fileStats.name.endsWith(".js")) {
			if(root.indexOf("test")=== -1 && root.indexOf("lang")=== -1) {
				jsFiles2.push(root + "/" + fileStats.name); //Do we care for lang folder files?		
			}
		  }
		if (fileStats.name.endsWith(".coffee")) {
			  coffeeFiles2.push(root + "/" + fileStats.name);
		  }
		  next();
      }
    , errors: function (root, nodeStatsArray, next) {
        next();
      }
    }
  };
	  
  walker = walk.walkSync(rootDir, options);
  })();
  var fileArr = [];
  fileArr.push(jsFiles2);
  fileArr.push(coffeeFiles2);
  return fileArr;
  //pkg.jsFiles=jsFiles2;
  //pkg.coffeeFiles=coffeeFiles2;
};

// Function: Return the name of the package, or return NO_NAME if there is no name
Scanning.name = function(pkgInfo) {
	return pkgInfo.name == undefined ? "NO_NAME" : pkgInfo.name;
};

// Function: Return the version of the package, or return NO_VERSION if there is no name
Scanning.version = function(pkgInfo) {
	return pkgInfo.version == undefined ? "NO_VERSION" : pkgInfo.version;
};

// Function: Calculate and return the type of update: major, minor, patch, or original.
Scanning.updateType = function(pkgInfo1, pkgInfo2) {
	"use strict";
	// Check if there is no previous package
	try{
		if (pkgInfo2 === undefined) {
			return "0";
		}
	}
	catch(e) {
		console.log(e);
	}
	
	// !! NOTE: THIS SECTION WILL NEED TO BE CHANGED TO MATCH OTHER SYNTAX (e.g. 1.0 for patch; 1 for major, etc.).
	var previous= Scanning.version(pkgInfo2);
	var current= Scanning.version(pkgInfo1);
	
	// check if versions exist before trying to split; Did the author include a version section in their package.JSON?
	if(current==="NO_VERSION" || previous==="NO_VERSION"){
			return "0";
		}

	//Compare the numbers of the package file. NOTE: This will need to be changed for the other formats.
	previous=previous.split(".");
	current=current.split(".");
	for (var i=0; i<previous.length;i++){
		if(previous[i]===current[i]){
				continue;
			}
		else{
			if(i===0){	
				return "3";
				}
			else if(i===1){	
				return "2";
				}
			else{
				return "1";
				}
			}
		}
};

Scanning.findAPI = function(jsFiles) {
	var foundAPI=[];
	var notFoundAPI=["HTTP","HTTPS","HTTP2","NET","FS","CHILD_PROCESS"];
	var APIS_USED=["NONE","NONE"];
	for(var a=0; a<jsFiles.length;a++){
		APIS_USED = AST.gatherAPI(jsFiles[a],foundAPI,notFoundAPI);
		foundAPI = APIS_USED[0];
		notFoundAPI = APIS_USED[1];					
		//console.log("[B] Found APIS: " + foundAPI + "\n Not found APIS: " + notFoundAPI);
	}
	var http_api = false;
	var https_api = false;
	var http2_api = false;
	var net_api = false;
	var fs_api = false;
	var childProcess_api = false;
	
	if(!foundAPI.length==0){
		for(var i=0;i<foundAPI.length;i++) {
			if(foundAPI[i]!==undefined){
				if(foundAPI[i].toUpperCase()=="HTTP"){
					http_api = true;
				}
				else if(foundAPI[i].toUpperCase()=="HTTPS"){
					https_api = true;
				}
				else if(foundAPI[i].toUpperCase()=="HTTP2"){
					http2_api = true;
				}
				else if(foundAPI[i].toUpperCase()=="NET"){
					net_api = true;
				}
				else if(foundAPI[i].toUpperCase()=="FS"){
					fs_api = true;
				}
				else{
					childProcess_api = true;
				}
			}      
		}
	}
	//console.log("Returning.");
	return [[http_api,https_api,http2_api,net_api,fs_api,childProcess_api],APIS_USED[0],APIS_USED[1]];
};

Scanning.apiUsage = function(jsFiles,j,jsFilesBefore) {
	//console.log("Calling");
	var currentAPI = Scanning.findAPI(jsFiles);
	//console.log("[A] Found APIS: " + currentAPI[1] + "\n Not found APIS: " + currentAPI[2] + "\n ------- \n");
	var newAPI=false;
	var firstEval=false;
	var firstFunction=false;
	//If 1st package, check that any API is used and consider that a new API. 
	if(j==0){	
		for(var s=0; s<currentAPI[0].length;s++){
			if(currentAPI[0][s]==true){
				newAPI=true;
				break;
			}
		}
	}
	else{
		if(jsFilesBefore!=="NA"){
			var previousAPI = Scanning.findAPI(jsFilesBefore);
			for(var t=0; t<previousAPI.length;t++){
				if(previousAPI[t] == false && currentAPI[0][t] == true){
					newAPI=true;
					break;
				}
			}
			if(previousAPI[1]==false && currentAPI[1]==true){
				firstEval=true;
			}
			//console.log("PREVIOUS:"+previousAPI[2]);
			//console.log("CURRENT:"+currentAPI[2]);
			if(previousAPI[2]==false && currentAPI[2]==true){
				firstFunction=true;
			}
		}
	}
	var outputStr = "";
	for(var l=0; l<currentAPI[0].length;l++) {
		outputStr+=currentAPI[0][l]+",";
	}
	outputStr+=newAPI;
	return outputStr+","+firstEval+","+firstFunction;
};

Scanning.fileChanges = function(pkgInfo1,pkgInfo2,p,firstPackageRead) {
	if(firstPackageRead==false){
			if(p==0){
				if(pkgInfo1.jsFiles.length!==0){
					return true;
				}
				else{
					return false;
				}
			}
			else if(p==1){
				if(pkgInfo1.coffeeFiles.length!==0){
					return true;
				}
				else{
					return false;
				}
			}
			else{
				//var current = Scanning.depList(pkgInfo1);
				//var currentVersions = current[1];
				if(Scanning.countDep(pkgInfo1) !== 0) {
					return true;
				}
				else {
					return false;
				}
			}
		}
	else{
		//Collect the dependencies and versions from the previous and current version
		if(p==0){
			var previousNames = Scanning.removeRootDir(pkgInfo2.rootDir, pkgInfo2.jsFiles);
			var previousVersions = 0;
			
			var currentNames = Scanning.removeRootDir(pkgInfo1.rootDir, pkgInfo1.jsFiles);
			var currentVersions = 0;
		}
		else if(p==1){
			var previousNames = Scanning.removeRootDir(pkgInfo2.rootDir, pkgInfo2.coffeeFiles);
			var previousVersions = 0;
			
			var currentNames = Scanning.removeRootDir(pkgInfo1.rootDir, pkgInfo1.coffeeFiles);
			var currentVersions = 0;
		}
		else{
			var previous = Scanning.depList(pkgInfo2);
			var previousNames = previous[0];
			var previousVersions = previous[1];

			var current = Scanning.depList(pkgInfo1);
			var currentNames = current[0];
			var currentVersions = current[1];
		}
		var changes = Scanning.compareFiles(previousNames,currentNames,p,previousVersions,currentVersions);
		return changes;
	}
};

Scanning.removeRootDir = function(rootDir, filesArray) {
	var newFilesArray = [];
	var rootDirLength = rootDir.length;
	filesArray.forEach(function(elem) {
		newFilesArray.push(elem.substring(rootDirLength));
	});
	return newFilesArray;
};

// Function: Return a list of what has changed
Scanning.compareFiles = function(oldFiles,newFiles,p,verOld,verNew){
	var sameName=[];
	var newName=[];
	var removedName=[];
	
	if (newFiles == undefined || oldFiles == undefined) throw Error('newFiles or oldFiles should not be undefined');
	if(oldFiles.length == 0) {
		// NOTE: FIX THIS
		var difference=0;
		if(p===0) {
			difference=newFiles.length;
		}
		else if(p===1) {
			difference=newFiles.length;
		}
		else {
			// NOTE: Why don't I compare depList here? ***************************** ADDRESS THIS
			difference=Scanning.countDep(newFiles)-Scanning.countDep(oldFiles);
		}
		// If there are new files or dependencies, return true. 
		if(difference>0){
			return true;
		}
		else{
			return false;
		}
	}	
	else {
		var temp=oldFiles.slice(0);
		newFiles.forEach(function(file){
			var found=false;
			for(var i=temp.length-1;i>=0;i--){
					if(file==temp[i]){
						found=true;
						var temp1=temp.slice(0,i);
						temp=temp1.concat(temp.slice(i+1));
						break;
					}
				}
			if(found==true){
					sameName.push(file);
				}
			else{
				newName.push(file);
			}
		});
		if(temp.length!==0){
			for(var i=0;i<temp.length;i++){
				removedName.push(temp[i]);
			}
		}

		if(p!==2){
			// If there are no new files added from the previous version, return false. 
			if(newName.length==0){
				return false;
			}
			else{
				return true;
			}
			//return newName.length+","+removedName.length;
		}
		// ------------------- Check to see if same name packages have different versions ---------------------
		else{
			var changed=newName.length;
			sameName.forEach(function (name){
				if(verOld[oldFiles.indexOf(name)]!==verNew[newFiles.indexOf(name)]){
					changed++;
				}
			});
			if(changed==0){
				return false;
			}
			else{
				return true;
			}
			//return changed+","+removedName.length;
		}
	}
};

// Function: Return the total number of dependencies
Scanning.countDep = function(pkgInfo){
	try{
		var dep=pkgInfo.dependencies;
		if(dep==undefined){
			dep=0;
		}
		else{
		    dep=Object.values(dep).length;
		}
	}
	catch(err){
		var dep=0;
	}
	
	try{
		var devDep=pkgInfo.devDependencies;
		if(devDep==undefined){
			return dep;
		}
		devDep=Object.values(devDep).length;
		//CHECKER: console.log(dep + " dependencies + " + devDep + " devDependencies");
		dep+=devDep;
		return dep;
	}
	catch(err){
		//CHECKER: console.log(dep + " dependencies");
		return dep;
	}
};

// Function: Return a list of dependency names
Scanning.depList = function(pkgInfo){
	var depNames=[];
	var depVersions=[];
	try{
		var devDep = pkgInfo.devDependencies;
		if (devDep != undefined && devDep.length != 0) { 
			depNames=Object.getOwnPropertyNames(devDep);
			depVersions=Object.values(devDep);
		}
	}
	catch(err){
		
	}
	try{
		var dep = pkgInfo.dependencies;
		//Check to see if there are 0 dependencies
		if (dep != undefined || dep.length != 0) {
			var depNames2=Object.getOwnPropertyNames(dep);
			var depVersions2=Object.values(dep);
			for(var i=0;i<depNames2.length;i++){
				depNames.push(depNames2[i]);
			}
			for(var j=0;j<depNames2.length;j++){
				depVersions.push(depVersions2[j]);
			}
		}
	}
	catch(err){
		
	}
	var nameVer=[depNames,depVersions];
	return nameVer;
};

/* 
Scanning.apis = function(pkgInfo){
	var apiNames = ["",]
	
	var arr = Scanning.depList(pkgInfo);
	arr = arr[0];
	
}
*/

Scanning.examineJS = function(jsFiles,pkg){
	"use strict";
	var replace_1=/\/\/.+?\n/;
	var replace_2=/\/\*.+?\*\//;
	var externalFound=false;
	
	//console.log(jsFiles.length);
	//This for loop is to go through all js files to see if an external package is used once
	for(var k=0;k<jsFiles.length;k++){
		//Read file, remove comments (reduce # of false positives)
		var fileContent = fs.readFileSync(jsFiles[k]).toString();
		fileContent=fileContent.replace(replace_1,"");
		fileContent=fileContent.replace(replace_2,"");
		
		var usedDep=[];
		var numReq=0;
		var requireRegex_1 = /require\(\"[\w\-*]*/gm;
		var requireRegex_2 = /require\(\'[\w\-*]*/gm;
		var regExp=[requireRegex_1,requireRegex_2];
		for(var i=0; i<regExp.length;i++){
			var count = fileContent.match(regExp[i]);
			if(count != undefined){
				numReq+=count.length;
				for(var j=0;j<count.length;j++){
					var splitLine=count[j].split("\"");
					if(splitLine.length==1){
					   splitLine=count[j].split("\'");
					}
					usedDep.push(splitLine[1]);
				}
			}
		}
		
		for(var l=0; l<regExp.length;l++){
			var count = fileContent.match(regExp[l]);
			if(count != undefined){
				numReq+=count.length;
				for(var y=0;y<count.length;y++){
					var splitLine=count[y].split("\"");
					if(splitLine.length==1){
					   splitLine=count[y].split("\'");
					}
					usedDep.push(splitLine[1]);
				}
			}
		}
		
		var listOfDep=Scanning.depList(pkg);
		listOfDep=listOfDep[0];
		for(var j=0;j<usedDep.length;j++){
			if(listOfDep.indexOf(usedDep[j])!=-1){
				externalFound=true;
				var broken=true;
				break;
			}
		}
		if(externalFound){
			break;
		}
	}
	return externalFound;
}

Scanning.hookupScripts = function(pkgNew,pkgOld,j){ 
	try{var scriptsNew=pkgNew.scripts; if(scriptsNew==null){return "false,false";}}
	catch(e){return "false,false";}
	
	try{var scriptsOld=pkgOld.scripts;if(scriptsOld==null){return "true,true";}}
	catch(err){return "true,true";}

	var hookupPresent=true;
	// ALERT: YOU NEED TO MAKE THIS EXAMINE THE CHANGE IN HOOKUP SCRIPTS LATER
	var a = Object.keys(pkgNew.scripts);
	var b = Object.keys(pkgOld.scripts);
	if(a.length > b.length){
		return hookupPresent+",true";
	}
	else{
		var sameName=[];
		for(var l=0;l<b.length;b++){
			for(var p=0;p<a.length;b++){
				if(a[p]==b[l]) {
				  sameName.push(b[l]); 
				  break;
				}
			}
		}
		if(sameName.length == a.length){
			return hookupPresent+",false"; 
		}
		else{
			return hookupPresent+",true";
		}
	}
}

/*
	Test cases
*/

module.exports = Scanning;
