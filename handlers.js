var mongo = require('mongodb'),
	helpers = require('./helpers'),
	
	mongoUri = process.env.MONGOHQ_URL || 'mongodb://localhost/mydb';

var defaultCollection = 'test';

//Perform an operation on mongoDB defaultCollection. This is crap
function dbOp(callback)
{
	mongo.MongoClient.connect(mongoUri, function (err, db) {
		if(err) { throw err; }

		if(typeof callback === 'function')
		{
			var collection = db.collection(defaultCollection);
			callback(db, collection);
		}
	});
}

//Check that required properties are set with adequate length and are of allowed data types
function validateInput(data)
{
	if(typeof data === 'object')
	{
		var requiredProps = ['name', 'company'],
			allowedTypes = ['string', 'number', 'undefined'],
			minLength = 2;

		for(var prop in data)
		{
			if(allowedTypes.indexOf( typeof prop ) === -1)
			{
				return false;	//Not an allowed data type
			}

			if(requiredProps.indexOf(prop) === -1 || prop.length < minLength)
			{
				return false;	//Not in required properties or too short property
			}

		}

		//All ok
		return true;
	}

	return false;
}

//Main page
function main(req, res)
{
	helpers.getFile('/main.html', function(fileData) {
		res.end(fileData);
	}, res, false);
}

//Main page
function tests(req, res)
{
	helpers.getFile('/tests.html', function(fileData) {
		res.end(fileData);
	}, res, false);
}

//Get list of clients and return data set as JSON
function getAllClients(req, res)
{
	dbOp(function(db, collection) {
		var c = collection.find();

		c.sort('company').toArray(function(err, docs) {
			res.writeHead(res.statusCode, {'Content-Type': 'application/json' });
			res.end(JSON.stringify(docs));
			db.close();
		});
	});
}

function getClient(req, res)
{
	req.on('data', function(chunk) {
		var data = JSON.parse( chunk.toString() ),
			objID;

		if(data.id)
		{
			objID = new mongo.ObjectID(data.id);
			dbOp(function(db, collection) {
				collection.findOne({ '_id': objID }, function(err, doc) {
					res.writeHead(res.statusCode, {'Content-Type': 'application/json' });
					res.end(JSON.stringify(doc));
					db.close();
				});
			});
		}
		else
		{
			res.writeHead(res.statusCode, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({}));
		}
	});
}

//Something of a poor REST API for adding/editing/deleting client data, only supports PUT and DELETE
function editClient(req, res)
{
	var dbRef;

	//Called when everything else is done
	function finishEdit(err)
	{
		var status = (!err);
		res.writeHead(res.statusCode, { 'Content-Type': 'application/json' });
		res.end( JSON.stringify({ 'status': status }) );
		if(dbRef)
		{
			dbRef.close();
		}
		
	}

	var buffer = '';
	req.on('data', function(chunk) {
		buffer += chunk;
	});

	req.on('end', function() {
		var data = JSON.parse(buffer);
		var objID;

		if(data.id)
		{
			objID = new mongo.ObjectID(data.id);
			
		}
		
		delete data.id;
		
		if(req.method === 'PUT')
		{
			if(validateInput(data))
			{
				dbOp(function(db, collection) {
					//Edit existing client if id defined, otherwise insert new client
					dbRef = db;
					collection.update({ '_id': objID }, data, { safe: true, upsert: true }, finishEdit);
				});

			}
			else
			{
				//Didn't pass data validation
				finishEdit(true);
			}

			
		}
		else if(req.method === 'DELETE')
		{
			//Delete client
			if(objID)
			{
				dbOp(function(db, collection) {
					dbRef = db;
					collection.remove({ '_id': objID }, { single: true }, finishEdit);
				});
			}
			else
			{
				finishEdit(true);
			}
		}
		else
		{
			res.writeHead(403, { 'Content-Type': 'text/plain' });
			res.end('Method not supported');
			return;
		}
    });
}

exports.main = main;
exports.tests = tests;
exports.editClient = editClient;
exports.getClient = getClient;
exports.getClientList = getAllClients;