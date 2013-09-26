
/*==========  variable declarations  ==========*/

var	http  = require('http'), 	// access to Node's HTTP-related functionality
	fs    = require('fs'), 		// the ability to interact with the filesystem
	path  = require('path'), 	// functionality related to file paths
	mime  = require('mime'),	// the ability to determine a file's MIME type
	cache = {};  				// used to cache file data


/*==========  three helper functions used for serving static HTTP files  ==========*/

// handle the sending of 404 errors for when a file is requested that doesn't exist
function send404(response) {
	response.writeHead(404, {'Content-Type': 'text/plain'});
	response.write('Error 404: resource not found.');
	response.end();
}

// handles serving file data
function sendFile(response, filePath, fileContents) {
	response.writeHead(
		200,
		{"Content-Type": mime.lookup(path.basename(filePath))}
	);
	response.end(fileContents);
}

// determines whether or not a file is cached (for speed) and, if so, serves it.
// If a file isn't cached, it is read from disk and served.
// If the file doesn't exist, an HTTP 404 error is returned as a response.
function serveStatic(response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);
	} else {
		fs.exists(absPath, function(exists) {
			if (exists) {
				fs.readFile(absPath, function(err, data) {
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data);
					}
				});
			} 
		});
	}
}


/*==========  HTTP server  ==========*/

// create HTTP server
var server = http.createServer(function(request, response) {
	var filePath = false;

	if (request.url == '/') { 				// Determine HTML file to be served by default
		filePath = 'public/index.html';
	} else {
		filePath = 'public' + request.url;  // Translate URL path to relative file path
	}

	var absPath = './' + filePath;
	serveStatic(response, cache, absPath);
});

// start the HTTP server, listen on TCP/IP port 3000
server.listen(3000, function() {
	console.log("Server listening on port 3000.");
})


/*==========  set up the Socket.io server  ==========*/

var chatServer = require('./lib/chat_server');
chatServer.listen(server); // share the same TCP/IP port

