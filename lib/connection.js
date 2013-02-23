var events = require('events'),
	net = require('net'),
	util = require('util'),
	Cursor = require('./cursor'),
	CONST = require('./const'),
	Frame = require('./frame'),
	ops = require('./ops');

var noop = function() {};

var Connection = function(host, port)
{
	if (!host || !port)
	{
		throw new Error("Must provide host and port. " + util.inspect(host) + ' and ' + util.inspect(port) + ' provided');
	}

	events.EventEmitter.call(this);

	this._available = new IDPool();

	this.host = host;
	this.port = port;

	this._connection = null;
	this._ready = false;
	this._sending = {};

	this._options = {};
};

util.inherits(Connection, events.EventEmitter);

Connection.prototype.open = function()
{
	this._connection = net.connect(
	{
		host: this.host,
		port: this.port
	});

	this._connection.once('connect', this._onConnect.bind(this));
	return this;
};

Connection.prototype._onConnect = function()
{
	this._connection.on('data', this._onData.bind(this));
	this._connection.once('error', this._onError.bind(this));
	this._connection.once('end', this._onEnd.bind(this));

	var that = this,
		options = {};

	options[CONST.STARTUP_OPTIONS.CQL_VERSION] = '3.0.0';

	that.options(function(err, data)
	{
		if (err)
		{
			return that.close(err);
		}

		that._options = data;

		that.startup(options, function(err, data)
		{
			if (err)
			{
				return that.close(err);
			}

			return that.emit('_ready', that);
		});
	});
};

Connection.prototype._onData = function(data)
{
	var buf = Cursor(data),
		toHandle = [];

	while (!buf.eof())
	{
		if (!this._activeFrame)
		{
			this._activeFrame = new Frame();
		}

		var done = this._activeFrame.readData(buf);

		if (done)
		{
			toHandle.push(this._activeFrame);
			this._activeFrame = null;
		}
	}

	for (var i in toHandle)
	{
		this.handle(toHandle[i]);
	}
};

Connection.prototype._onError = function(err)
{
	this.emit('error', new ConnectionError(-1, err));
};

Connection.prototype._onEnd = function()
{
	this._connection.removeAllListeners('data');
};

Connection.prototype.ready = function(cb)
{
	if (this._ready)
	{
		return cb(this);
	}

	this.once('_ready', cb);
};

Connection.prototype.handle = function(frame)
{
	var err, 
		data, 
		obj = this._sending[frame.id];

	try
	{
		data = frame.body;

		if (ops[frame.opcode] && ops[frame.opcode].response)
		{
			data = ops[frame.opcode].response(data);
		}

		if (frame.opcode == CONST.OPCODE.ERROR)
		{
			throw new ConnectionError(data.type, data.message + ' ' + frame);
		}

		if (frame.opcode == CONST.OPCODE.EVENT)
		{
			this.emit('event', data);
			return;
		}

		if (!this._sending.hasOwnProperty(frame.id))
		{
			throw new ConnectionError(-2, 'Unexpected response: ' + frame);
		}

		if (obj.spec.expects && obj.spec.expects !== frame.opcode)
		{
			throw new ConnectionError(-2, 'Expected response (' + CONST.OPCODE_LOOKUP[obj.spec.expects] + ') does not match response (' + CONST.OPCODE_LOOKUP[frame.opcode] + ')');
		}

	}
	catch (e)
	{
		err = e;
	}

	delete this._sending[frame.id];
	this._available.release(frame.id);

	if (obj)
	{
		obj.cb(err, !err && data);
	}

	if (err)
	{
		return this.emit('error', err);
	}
};

Connection.prototype.send = function(op)
{
	var args = Array.prototype.slice.call(arguments, 1), cb = noop;

	if (args.length && typeof args[args.length - 1] === 'function')
	{
		cb = args[args.length - 1];
		args.pop();
	}

	var c = this._connection,
		spec = ops[op],
		sending = this._sending;

	if (!spec)
	{
		return cb(new ConnectionError(-2, "Op type " + op + " can not be send"));
	}

	this._available.acquire(function(id)
	{
		var frame = new Frame();

		frame.version = CONST.VERSION.REQUEST;
		frame.id = id;
		frame.opcode = op;

		if (spec.body)
		{
			frame.body = spec.body.apply(null, args);
		}

		sending[id] = {spec: spec, frame: frame, cb: cb};

		c.write(frame.encode());

		(function to(cum, interval)
		{
			setTimeout(function()
			{
				if (sending[id] && sending[id].frame === frame)
				{
					console.log('still open after ' + (++cum * interval) + ' seconds', frame.toString('utf8'));
					to(cum, interval);
				}
			}, interval * 1000);
		})(0, 5);
	});
};

Connection.prototype.close = function(reason)
{
	if (reason)
	{
		console.log("Closing connection.", reason);
	}

	this._connection.end();
};

function sendThrough(op)
{
	return function()
	{
		var args = [].slice.call(arguments);
		args.unshift(op);

		return this.send.apply(this, args);
	};
}

for (var i in CONST.OPCODE_REQUEST)
{
	var op = CONST.OPCODE_REQUEST[i],
		name = CONST.OPCODE_LOOKUP[op];

	Connection.prototype[name.toLowerCase()] = sendThrough(op);
} 

var ConnectionError = function(type, message)
{
	Error.call(this, message);
	Error.captureStackTrace(this, arguments.callee);

	this.type = type;
	this.message = message;
};

util.inherits(ConnectionError, Error);

function emptyIdArray()
{
	var ids = [];

	for (var i = 0; i < 128; i++)
	{
		ids.push(i);
	}

	return ids;
}

//simple id pool of 128 shorts
//to use for frame ids
var IDPool = function()
{
	this._pool = emptyIdArray();
	this._cbs = [];
};

IDPool.prototype.acquire = function(cb)
{
	this._cbs.push(cb);
	return this._refresh();
};

IDPool.prototype.release = function(id)
{
	this._pool.push(id);
	return this._refresh();
};

IDPool.prototype._refresh = function()
{
	while (this._pool.length && this._cbs.length)
	{
		this._cbs.shift()(this._pool.shift());
	}

	return this;
};

module.exports = Connection;
