/*
	FILE NAME: 
	Purpose: 
	
	Functions:
	[1] importFile (string) : 
	[2] clearDirectory (path) : Clear the tarball directory before downloading new packages.
	[3] download
	[4] decCounter
	[5] tryThis
	[6] unzip
*/

/*
	Input, output, and directory paths
*/
	var inputFile = "NEW_Sample.csv";
	var tarballDir = "/Users/kalilthenerd/documents/REU/tarballs/";
	// Which line number would you like the program to begin on?
	var startingNumber = 35;
	// Error numbers: 1990 || GO TO 9999
	var lastIndex = 9999;
	var SCAN = require("./REU_NewExtract");
/*
	Global variables
*/
	var kalil = {};
	var paths = [];
	var counter = [];
	var tracker = [];
	var piped = [];
	var globalPathNumber = 0;
	var upperLimitDefined = false;
	var upperLimit;

	var errorDir = "";
	var currentDir = tarballDir+"";
		currentDir = currentDir.split("/");
	for(var l=1;l<currentDir.length-2;l++){
		if(l==1){
			errorDir+="/";
		}
		errorDir+=currentDir[l]+"/";
	}
	errorDir+="error.csv";

/*
	Required packages and APIs
*/
	var fs = require("fs");
	var http = require("https");
	var decompress = require('decompress');
	var decompressTargz = require('decompress-targz');
/*
	Functions
*/

kalil.importFile = function (packageLine,ul) {
	// PackageLine example: ImAPackage,2,1.0.0;1.0.1 (Name, number of versions, versions seperated by a semicolon)
	// Assign each package line to a local variable number to avoid overwriting the same global variable
	var currentPathNum=globalPathNumber;
	globalPathNumber++;
	// Clear the tarball directory before beginning a download
	if(pkgLineArray[0]==packageLine){kalil.clearDirectory(tarballDir,0)}
	if(!upperLimitDefined){upperLimit=ul; upperLimitDefined=true;}
	if((currentPathNum+startingNumber)>=upperLimit){return;}
	// Create a pathNumber specific array to contain the path of the extracted .targz file (e.g. ../TarballDir/Pkg/Pkg-1.0.0)
	paths[currentPathNum]=[];
	var fields = packageLine.split(",");
	var pkgName = fields[0];
	var numVersions = fields[1];
	piped[currentPathNum]=[numVersions,numVersions];
	tracker.push([0,numVersions]);
	counter[currentPathNum]=numVersions;
	var versions = fields[2].split(";");
	var duplicates=false;
	for(var l=1;l<versions.length;l++){
		var str1 = versions[l-1].toUpperCase();
		var str2 = versions[l].toUpperCase();
		if(str1 == str2){
			duplicates=true;
			break;
		}
	}
	if(duplicates){
		console.log("Duplicate versions found for package #" + (globalPathNumber+startingNumber));
		fs.appendFileSync(errorDir,"Duplicate versions found for this package: \n" + pkgName);
		kalil.importFile(pkgLineArray[globalPathNumber+startingNumber+1]);
	}
	else{
		var fileName=[];
		var tarballs=[];
		for(var j=0;j<numVersions;j++){
			fileName.push(pkgName+"-"+versions[j]);
			if(pkgName.indexOf("@")!=-1){
				var splitArr=pkgName.split("/");
				var correctedName=splitArr[1];
				tarballs.push("https://registry.npmjs.org/"+pkgName+"/-/"+splitArr[1]+"-"+versions[j]+".tgz");
			}
			else{
				tarballs.push("https://registry.npmjs.org/"+pkgName+"/-/"+pkgName+"-"+versions[j]+".tgz");
			}
			setTimeout(kalil.download, 500, tarballs[j], tarballDir+pkgName+"/", fileName[j] + ".tar.gz",currentPathNum);
		}
	}
};

kalil.clearDirectory = function(path,directoryPosition) {
	var reset=false;
	if (fs.existsSync(path)) {
		reset=true;
		fs.readdirSync(path).forEach(function(file){
		  var curPath = path + "/" + file;
		  if (fs.lstatSync(curPath).isDirectory()) { // recurse
			kalil.clearDirectory(curPath, directoryPosition+1);
		  } else { // delete file
			fs.unlinkSync(curPath);
		  }
		});
		fs.rmdirSync(path);
	  }
	try{if(directoryPosition==0){fs.mkdirSync(tarballDir); console.log("The directory has been reset.");}}
	catch(err){}
}

kalil.download = function (url, dest, fileName,pathNumber) {
	// Known error: VERSIONS WITH SAME NAME
	if (!fs.existsSync(dest)) {
		var rmvdRoot = dest.replace(tarballDir,'');
		rmvdRoot = rmvdRoot.substring(0,rmvdRoot.length-1);	
		if(rmvdRoot.indexOf("/")==-1){
			fs.mkdirSync(dest);
		}
		else{
			var index = rmvdRoot.indexOf("/");
			while(index!=-1){
				var before=rmvdRoot.substring(0,index);
				var after=rmvdRoot.substring(index+1);
				rmvdRoot=before + "-" + after;
				index = rmvdRoot.indexOf("/");
			}
			dest=tarballDir+rmvdRoot+"/";
			fileName=fileName.replace("/","-");
			if (!fs.existsSync(dest)){
				fs.mkdirSync(dest);
			}
		}
	}
	http.get(url, (res) => {
		//console.log(res.statusCode +": " + url);
		if (res.statusCode != 200) {
			console.log("Error while trying to download package #" + (pathNumber+startingNumber+1));
			fs.appendFileSync(errorDir,"Error while trying to download package #: " + (globalPathNumber+startingNumber));
			if(pathNumber+startingNumber+1==globalPathNumber+startingNumber){
				kalil.importFile(pkgLineArray[pathNumber+startingNumber+1]);
			}
			else{
				return;
			}
		}
		else{
			paths[pathNumber].push(dest+fileName);
			var file = fs.createWriteStream(dest+fileName);
			//console.log("Downloading a version: piping");
			res.pipe(file);
			kalil.flowing(pathNumber);
			file.on('finish', function() {
				//console.log("Piping complete: " + url);
				kalil.decCounter(pathNumber);
				file.close();
			});
			
		}
	}).on('error', function(err) { 
		//fs.unlink(dest);
		console.log("Error while trying to download package #" + (pathNumber+startingNumber+1));
		fs.appendFileSync(errorDir,"Error while trying to download package #: " + (globalPathNumber+startingNumber));
			if(pathNumber+startingNumber+1==globalPathNumber+startingNumber){
				console.log("Moving to the next file.");
				kalil.importFile(pkgLineArray[pathNumber+startingNumber+1]);
			}
			else{
				console.log("Not moving");
				return;
			}
	});
};

kalil.flowing = function (pathNumber){
    piped[pathNumber][0]--
	if(piped[pathNumber][0]==0){
		console.log("Done piping.");
	}
};

kalil.decCounter = function (pathNumber){
	counter[pathNumber]--;
	//console.log(counter[pathNumber] + " left remaining.");
	if(counter[pathNumber]==0){
		kalil.tryThis(pathNumber);
	}
};

kalil.tryThis = function (pathNumber) {
	if(tracker[pathNumber][0]<tracker[pathNumber][1]){
		kalil.unzip(paths[pathNumber][tracker[pathNumber][0]],pathNumber);
	}
	else{
		console.log("Package #"+(pathNumber+startingNumber+1)+" prepared.")
		var folderPath="";
		var pathName = paths[pathNumber][0].split("/");
		for(var p=1;p<pathName.length-1;p++){
			if(p==1){
				folderPath+="/";
			}
			folderPath+=pathName[p]+"/";
		}
		//console.log(folderPath);
		try{console.log("Preparing to scan package."); SCAN.prepare(folderPath);}
		catch(err){console.log("Error scanning this file: " + err);}
		SCAN.removeDirectory(folderPath);
		console.log("Package successfully deleted.");
		kalil.importFile(pkgLineArray[pathNumber+startingNumber+1]);
	}
};

kalil.unzip = function(zipFile,pathNumber){
	var arr=zipFile.split("/");
	var name=arr[arr.length-2];
	decompress(zipFile, tarballDir + name+"/", {
    plugins: [
        decompressTargz()
    ]
}).then(() => {
	var index=arr[arr.length-1].indexOf(".tar.gz");
	try{
		fs.renameSync(tarballDir+name+"/package", tarballDir+name+"/"+arr[arr.length-1].substring(0,index));
		fs.unlinkSync(zipFile);
		tracker[pathNumber][0]++;
		kalil.tryThis(pathNumber);
	}
	catch(err){
		console.log("Unable to catch duplicate versions for package #" + (globalPathNumber+startingNumber));
		fs.appendFileSync(errorDir,"Unable to catch duplicate versions for package #: " + (globalPathNumber+startingNumber));
		kalil.importFile(pkgLineArray[pathNumber+startingNumber+1]);
	}
});
};
	
var pkgLineArray = fs.readFileSync(inputFile);
	pkgLineArray = pkgLineArray.toString();
	pkgLineArray = pkgLineArray.split("\n");
	kalil.importFile(pkgLineArray[startingNumber],lastIndex);

/*
	Test cases
*/
