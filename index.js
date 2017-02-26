const http = require('http');
const httpShutdown = require('http-shutdown');
const util = require("util");
const url = require('url');
const spawn = require('child_process').spawn;
const fs = require('fs');
const req = require('request');
const tmp = require('tmp-promise');
const Promise = require('bluebird');

Promise.longStackTraces();
const PORT=8080; 

var validateRequest = function(request, response) {
    var urlParts = url.parse(request.url, true);
    var imageUrl = urlParts.query['image_url'];
    
    if (urlParts.pathname !== '/') {
        throw new Error('Invalid path');
    } else if (!imageUrl) {
        throw new Error('Missing required parameter');
    }
    
    const supportedTypes = ['jpg', 'jpeg'];
    const countryCodes = ['us', 'eu', 'gb'];
    const regexType = /\.(\w+)$/;
    const match = regexType.exec(imageUrl.toLowerCase());
    
    var result = {'url': imageUrl}
    
    if (match) {
        const type = match[1];
        if (supportedTypes.indexOf(type) === -1) {
            throw new Error('Unsupported type');
        }
        result['type'] = match[1];
    }
    
    //check country code
    if (countryCodes.indexOf(urlParts.query['country_code']) !== -1) {
        result['country_code'] = urlParts.query['country_code'];
    }
    
    //check pattern
    if (/^\w{2,3}$/.exec(urlParts.query['pattern']) !== null) {
        result['pattern'] = urlParts.query['pattern'];
    }    
    return result;
}

var createTempFile = function(postfix) {
    return tmp.file({postfix: postfix});
};

var downloadFile = function(uri, tmpFile) {
    return new Promise(function(resolve, reject){
        console.log("Download %s to %s", uri, tmpFile);
        writeStream = fs.createWriteStream(tmpFile);
        req(uri)
            .pipe(writeStream)
            .on('error', reject);
        writeStream
            .on('close', function() {
                //close stream - flush data to drive
                writeStream.end();
                resolve(tmpFile);
            })
            .on('error', reject);
    });
};

var runAlpr = function(filepath) {
    return new Promise(function(resolve, reject) {
        console.log("Run alpr for %s", filepath);
        const alpr = spawn('alpr', ['-j', '-c', 'eu', '-p', 'sk', filepath]);
        var outputData = "";
        alpr.on('error', reject);
        alpr.stdout.on('data', function(data) {
            outputData += data.toString();
        });
        alpr.stderr.on('data', function(data){
            reject(data);
        });
        alpr.on('close', function(){
            resolve(outputData);
        });
    });
};

var handleValidRequest = function(params, response) {
    var tmpFile;
    return createTempFile('.'+params['type'])
        .then(function(file) {
            tmpFile = file;
            return downloadFile(params.url, file.path);
        })
        .then(runAlpr)
        .then(function(data) {
            response.end(data);
        })
        .finally(function() {
            fs.unlink(tmpFile.path, function(err) {
                console.log('Cleaned up %s - %s', tmpFile.path, err);
            });
        });
}

var handleError = function(response, msg) {
    console.error(msg);
    response.writeHead(503, {"Content-Type": "text/plain"});
    response.write(msg.toString());
    response.end();
}

function handleRequest(request, response){
    try {
        const params = validateRequest(request, response);
        handleValidRequest(params, response)
            .catch(function(e){
                handleError(response, e);
            });
    } catch(e) {
        handleError(response, e);
    }  
}

//Create a server
var server = http.createServer(handleRequest);
server = httpShutdown(server);

//Lets start our server
server.listen(PORT, function(){
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Server listening on X: http://localhost:%s", PORT);
});