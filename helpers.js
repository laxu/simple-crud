var fs = require('fs');

var mimetypes = {
    'html': 'text/html',
    'css':  'text/css',
    'js':   'text/javascript',
    
    'ico':  'image/x-icon',
    'gif':  'image/gif',
    'jpg':  'image/jpeg',
    'png':  'image/png'
  };

function show404(res)
{
	res.writeHead(404, { 'Content-type': 'text/plain'});
	res.end('404 Not found');
}

function getContentType(filename)
{
	var ext = filename.split('.').pop();
	return mimetypes[ext];
}

function getFile(filename, callback, res, sync)
{
	if(!callback) { throw 'Callback must be defined'; }
	console.log('Loading file %s ' + ((!sync) ? 'a' : '') + 'syncronously', filename);

	var contentType = getContentType(filename);
	if(contentType)
	{
		//Valid filetype, set content type and read file
		var filePath = process.cwd() + filename;
		fs.exists(filePath, function(exists) {
			if(exists)
			{
				//File found
				if(sync)
				{
					//Load syncronously
					var data = fs.readFileSync(process.cwd() + filename);
					callback(data, contentType);
				}
				else
				{
					//Load asyncronously -- default		
					fs.readFile(filePath, function (err, data) {
						if (!err)
						{
							res.writeHead(res.statusCode, { 'Content-type': contentType });
							callback(data);
						}
					});
				}
			}
			else
			{
				//File not found
				show404(res);
			}
		});
	}
}

exports.show404 = show404;
exports.getFile = getFile;