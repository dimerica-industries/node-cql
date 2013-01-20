var Cursor = require('cursor'),
	util = require('util');

var CQLCursor = Cursor.extend(
{
	//int
	//
	//A 4 bytes integer
	readInt: function()
	{
		return this.readInt32BE();
	},

	writeInt: function(value)
	{
		return this.writeInt32BE(value);
	},

	//short
	//
	//A 2 bytes unsigned integer
	readShort: function()
	{
		return this.readUInt16BE();
	},

	writeShort: function(value)
	{
		return this.writeUInt16BE(value);
	},

	//string
	//
	//A [short] n, followed by n bytes representing an UTF-8
	//string.
	readString: function()
	{
		var len = this.readShort();
		return this.toString('utf8', len);
	},

	writeString: function(value)
	{
		var len = Buffer.byteLength(value, 'utf8');
		this.writeShort(len);
		return this.write(value, len, 'utf8');
	},

	//long_string
	//
	//An [int] n, followed by n bytes representing an UTF-8 string.
	writeLongString: function(value)
	{
		var len = Buffer.byteLength(value, 'utf8');
		this.writeInt(len);
		return this.write(value, len, 'utf8');
	},

	readLongString: function()
	{
		var len = this.readInt();
		return this.toString('utf8', len);
	},

	// string_list
	//
	// A [short] n, followed by n [string].
	writeStringList: function(value)
	{
		this.writeShort(value.length);

		for (var i in value)
		{
			this.writeString(value[i]);
		}

		return this;
	},

	readStringList: function()
	{
		var num = this.readShort(),
			list = [];

		for (var i = 0; i < num; i++)
		{
			var str = this.readString();
			list.push(str);
		}

		return list;
	},

	//bytes
	//
	//A [int] n, followed by n bytes if n >= 0. If n < 0,
	//no byte should follow and the value represented is `null`.
	writeBytes: function(value)
	{
		var len = value && value.length || 0;
		this.writeInt(len);

		if (len)
		{
			this.copyFrom(value);
		}

		return this;
	},

	readBytes: function()
	{
		var len = this.readInt();

		if (len <= 0)
		{
			return Cursor(0);
		}

		return this.slice(len);
	},

	//short_bytes
	//
	//A [short] n, followed by n bytes if n >= 0.
	writeShortBytes: function(value)
	{
		var len = value && value.length || 0;
		this.writeShort(len);

		if (len)
		{
			this.copyFrom(value);
		}

		return this;
	},

	readShortBytes: function()
	{
		var len = this.readShort();

		if (len === 0)
		{
			return Cursor(0);
		}

		return this.slice(len);
	},

	readInet: function()
	{
		var n = this.readInt8(),
			vals = [];

		for (var i = 0; i < n; i++)
		{
			vals.push(this.readInt8);
		}

		var port = this.readInt();

		return vals.join('.') + ':' + port;
	},

	writeInet: function(value)
	{
		var parts = value.split(':'),
			parts1 = parts[0].split('.');

		this.writeInt8(parts1.length);

		for (var i in parts1)
		{
			this.writeInt8(parts1[i]);
		}

		this.writeInt(parts[1]);

		return this;
	},

	//string_map
	//
	// A [short] n, followed by n pair <k><v> where <k> and <v>
	// are [string].
	writeStringMap: function(value)
	{
		var orig = this.tell(),
			count = 0;

		this.seek(orig + 2);

		for (var k in value)
		{
			count++;

			this.writeString(k);
			this.writeString(value[k]);
		}

		var pos = this.tell();
		this.seek(orig);
		this.writeShort(count);
		this.seek(pos);

		return this;
	},

	readStringMap: function()
	{
		var obj = {},
			count = this.readShort();

		for (var i = 0; i < count; i++)
		{
			var k = this.readString(); 
			var v = this.readString();

			obj[k] = v;
		}

		return obj;
	},

	//string_multimap
	//
	// A [short] n, followed by n pair <k><v> where <k> is a
	// [string] and <v> is a [string list].
	writeStringMultimap: function(value)
	{
		var count = 0,
			orig = this.tell();

		this.seek(orig + 2); 

		for (var i in value)
		{
			count++;

			this.writeString(i);
			this.writeString(value[i]);
		}

		var pos = this.tell();
		this.seek(orig);
		this.writeShort(count);
		this.seek(pos);

		return this;
	},

	readStringMultimap: function()
	{
		var n = this.readShort(),
			obj = {};

		for (var i = 0; i < n; i++)
		{
			var k = this.readString();
			var v = this.readStringList();

			obj[k] = v;
		}

		return obj;
	}
});

CQLCursor.lengthInt = function(value)
{
	return 4;
};

CQLCursor.lengthShort = function(value)
{
	return 2;
};

CQLCursor.lengthString = function(value)
{
	return CQLCursor.lengthShort() + Buffer.byteLength(value, 'utf8');
};

CQLCursor.lengthLongString = function(value)
{
	return CQLCursor.lengthInt() + Buffer.byteLength(value, 'utf8');
};

CQLCursor.lengthStringList = function(value)
{
	var len = CQLCursor.lengthShort();

	for (var i in value)
	{
		len += CQLCursor.lengthString(value[i]);
	}

	return len;
};

CQLCursor.lengthBytes = function(value)
{
	return CQLCursor.lengthInt() + (value && value.length || 0);
};

CQLCursor.lengthShortBytes = function(value)
{
	return CQLCursor.lengthShort() + (value && value.length || 0);
};

CQLCursor.lengthInet = function(value)
{
	return 1 + value.split('.') + CQLCursor.lengthInt();
};

CQLCursor.lengthStringMap = function(value)
{
	var count = CQLCursor.lengthShort();

	for (var k in value)
	{
		count += CQLCursor.lengthString(k);
		count += CQLCursor.lengthString(value[k]);
	}

	return count;
};

CQLCursor.lengthStringMultimap = function(value)
{
	var count = CQLCursor.lengthShort();

	for (var k in value)
	{
		count += CQLCursor.lengthString(k);
		count += CQLCursor.lengthStringList(value[k]);
	}

	return count;
};

module.exports = CQLCursor;
