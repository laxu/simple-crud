var http = require('http'),
	url = require('url'),
	path = require('path'),
	
	helpers = require('./helpers'),
	handlers = require('./handlers');

var port = process.env.PORT || 5000;

function route(r, req, res)
{
	console.log('Routing to %s', r);
	
	if(r === '/') { r = 'main'; }

	r = r.replace(/^\/|\/$/g, '');

	if(typeof handlers[r] === 'function')
	{
		//Valid route
		handlers[r](req, res);
		return true;
	}

	//Uh oh, not found
	helpers.show404(res);
	return false;
}

http.createServer(function (req, res) {
	var pathname = url.parse(req.url, true).pathname;
	
	if(path.extname(pathname))
	{
		//Requested file
		helpers.getFile(pathname, function(fileData) {
			res.end(fileData);
		}, res);
	}
	else
	{
		//Requested route
		route(pathname, req, res);
	}
	
}).listen(port, function() {
	console.log('Listening on ' + port);
});