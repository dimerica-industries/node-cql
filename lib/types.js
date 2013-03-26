var CONST = require('./const'),
	util = require('./util'),
	TYPE = CONST.RESULT_TYPE;

var types = {};

function fromBytes(buffer)
{
	var id = buffer.readShort(),
		subs = [],
		t;

	var type = types[id];

	if (!type)
	{
		throw new Error("Invalid type " + id + " specified");
	}

	if (typeof type === 'function')
	{
		type = type(buffer);
	}

	return type;
}

function identity(arg)
{
	return arg;
}

function createType(id, subs, attr)
{
	subs = subs || [];

	var obj = 
	{
		id: id,

		read_value: identity,

		toString: function()
		{
			var sub = '';

			if (subs.length)
			{
				sub = ' <' + subs.map(function(s)
				{
					return s.toString();
				}).join(', ') + '>';
			}

			return CONST.RESULT_TYPE_LOOKUP[id] + sub;
		}
	};

	for (var i in attr)
	{
		obj[i] = attr[i];
	}

	return obj;
}

types[TYPE.ASCII] = createType(TYPE.ASCII, null,
{
	read_value: function(buffer)
	{
		if (!buffer.length)
		{
			return null;
		}

		return buffer.toString('ascii');
	}
});

types[TYPE.BIGINT] = createType(TYPE.BIGINT, null,
{
	read_value: function(buffer)
	{
		if (!buffer.length)
		{
			return null;
		}

		var str = util.hexdec(buffer),
			num = +str;

		return str.length == String(num).length ? num : str;
	}
});

types[TYPE.BOOLEAN] = createType(TYPE.BOOLEAN, null,
{
	read_value: function(buffer)
	{
		if (!buffer.length)
		{
			return null;
		}

		return buffer.readInt8(0) === 1;
	}
});

types[TYPE.COUNTER] = createType(TYPE.COUNTER, null,
{
	read_value: types[TYPE.BIGINT].read_value
});

types[TYPE.DECIMAL] = createType(TYPE.DECIMAL, null,
{
	read_value: function(buffer)
	{
		if (buffer.length < 4)
		{
			return null;
		}

		var len = buffer.readInt32BE(0),
			str = util.hexdec(buffer);

		return str.substr(0, str.length - len) + '.' + str.substr(str.length - len);
	}
});

types[TYPE.DOUBLE] = createType(TYPE.DOUBLE, null,
{
	read_value: function(buffer)
	{
		if (buffer.length < 8)
		{
			return null;
		}

		return buffer.readDoubleBE(0);
	}
});

types[TYPE.FLOAT] = createType(TYPE.FLOAT, null,
{
	read_value: function(buffer)
	{
		if (buffer.length < 4)
		{
			return null;
		}

		return buffer.readFloatBE(0);
	}
});

types[TYPE.INET] = createType(TYPE.INET, null,
{
	read_value: function(buffer)
	{
		if (buffer.length < 4)
		{
			return null;
		}

		return Array.prototype.slice.call(buffer.buffer(), 0).join('.');
	}
});

types[TYPE.INT] = createType(TYPE.INT, null,
{
	read_value: function(buffer)
	{
		if (buffer.length < 4)
		{
			return null;
		}

		return buffer.readInt32BE(0);
	}
});

types[TYPE.TEXT] = createType(TYPE.TEXT, null,
{
	read_value: function(buffer)
	{
		if (!buffer.length)
		{
			return null;
		}

		return buffer.toString('utf8');
	}
});

types[TYPE.VARCHAR] = createType(TYPE.VARCHAR, null,
{
	read_value: types[TYPE.TEXT].read_value
});

types[TYPE.TIMESTAMP] = createType(TYPE.TIMESTAMP, null,
{
	read_value: function(buffer)
	{
		return +types[TYPE.BIGINT].read_value(buffer);
	}
});

types[TYPE.UUID] = createType(TYPE.UUID, null,
{
	read_value: function(buffer)
	{
		if (buffer.length < 16)
		{
			return null;
		}

		return [
			buffer.toString('hex', 4),
			buffer.toString('hex', 2),
			buffer.toString('hex', 2),
			buffer.toString('hex', 2),
			buffer.toString('hex')
		].join('-');
	}
});

types[TYPE.TIMEUUID] = createType(TYPE.TIMEUUID, null,
{
	read_value: types[TYPE.UUID].read_value
});

types[TYPE.VARINT] = createType(TYPE.VARINT, null,
{
	read_value: types[TYPE.BIGINT].read_value
});

types[TYPE.LIST] = function(buffer)
{
	var sub = fromBytes(buffer);

	var type = createType(TYPE.LIST, [sub],
	{
		read_value: function(buf)
		{
			if (!buf.length)
			{
				return null;
			}

			var len = buf.readShort();
				arr = [];

			for (var i = 0; i < len; i++)
			{
				var bytes = buf.readShortBytes();
				arr.push(sub.read_value(bytes));
			}

			return arr;
		}
	});

	return type;
};

types[TYPE.SET] = function(buffer)
{
	var sub = fromBytes(buffer);

	var type = createType(TYPE.SET, [sub], 
	{
		read_value: function(buffer)
		{
			if (!buffer.length)
			{
				return null;
			}

			var set = {},
				len = buffer.readShort();

			for (var i = 0; i < len; i++)
			{
				var bytes = buffer.readShortBytes();
				var val = sub.read_value(bytes);

				set[val] = val;
			}

			return set;
		}
	});

	return type;
};

types[TYPE.MAP] = function(buffer)
{
	var sub1 = fromBytes(buffer);
	var sub2 = fromBytes(buffer);

	var type = createType(TYPE.MAP, [sub1, sub2],
	{
		read_value: function(buffer)
		{
			if (!buffer.length)
			{
				return null;
			}

			var map = {},
				len = buffer.readShort();

			for (var i = 0; i < len; i++)
			{
				var key = buffer.readShortBytes();
				key = sub1.read_value(key);

				var val = buffer.readShortBytes();
				val = sub2.read_value(val);

				map[key] = val;
			}

			return map;
		}
	});

	return type;
};

for (var i in TYPE)
{
	if (!types[TYPE[i]])
	{
		types[TYPE[i]] = createType(TYPE[i]);
	}

	exports[TYPE[i]] = types[TYPE[i]];
}

exports.fromBytes = fromBytes;
