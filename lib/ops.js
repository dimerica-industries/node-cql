var CONST = require('./const'),
	Cursor = require('./cursor'),
	types = require('./types');

var OP = CONST.OPCODE;

//client -> server

exports[OP.STARTUP] =
{
	expects: OP.READY,

	body: function(options)
	{
		return Cursor(Cursor.lengthStringMap(options))
			.writeStringMap(options);
	}
};

exports[OP.OPTIONS] =
{
	expects: OP.SUPPORTED
};

exports[OP.QUERY] =
{
	expects: OP.RESULT,

	body: function(query, consistency)
	{
		consistency = consistency || CONST.CONSISTENCY.QUORUM;

		return Cursor(Cursor.lengthLongString(query) + Cursor.lengthShort())
			.writeLongString(query)
			.writeShort(consistency);
	}
};

exports[OP.PREPARE] =
{
	expects: OP.RESULT,

	body: function(query)
	{
		return Cursor(Cursor.lengthLongString(query))
			.writeLongString(query);
	}
};

exports[OP.EXECUTE] =
{
	expects: OP.RESULT,

	body: function(id, args, consistency)
	{
		consistency = consistency || CONST.CONSISTENCY.QUORUM;

		var n = args.length,
			len = Cursor.lengthShortBytes(id) + Cursor.lengthShort() * 2;

		for (var i in args)
		{
			len += Cursor.lengthBytes(args[i]);
		}

		var c = Cursor(len)
			.writeShortBytes(id)
			.writeShort(n);

		for (i in args)
		{
			c.writeBytes(args[i]);
		}

		return c.writeShort(consistency);
	}
};

exports[OP.REGISTER] =
{
	expects: OP.READY,

	body: function(list)
	{
		return Cursor(Cursor.lengthStringList(list))
			.writeStringList(list);
	}
};

//server -> client

exports[OP.ERROR] =
{
	response: function(body)
	{
		return {
			type: body.readInt(),
			message: body.readString()
		};
	}
};

exports[OP.READY] =
{
	response: function(body)
	{
		//noop - empty body
	}
};

exports[OP.AUTHENTICATE] =
{
	response: function(body)
	{
		return {
			authenticator: body.readString()
		};
	}
};

exports[OP.SUPPORTED] =
{
	response: function(body)
	{
		return body.readStringMultimap();
	}
};

exports[OP.RESULT] =
{
	responses:
	{
		VOID: function(body)
		{
			return null;
		},

		SET_KEYSPACE: function(body)
		{
			return body.readString();
		},

		PREPARED: function(body)
		{
			return {
				id: body.readShort(),
				metadata: read_metadata(body)
			};
		},

		SCHEMA_CHANGE: function(body)
		{
			return {
				change: body.readString(),
				keyspace: body.readString(),
				table: body.readString()
			};
		},

		ROWS: function(body)
		{
			var md = read_metadata(body),
				row_count = body.readInt(),
				data = [];

			for (i = 0; i < row_count; i++)
			{
				var row = {};

				for (var j  in md.columns)
				{
					var col = md.columns[j],
						bytes = body.readBytes();

					row[col.name] = col.type.read_value(bytes);
				}

				data.push(row);
			}

			return data;
		}
	},

	response: function(body)
	{
		var kind = body.readInt(),
			fn = this.responses[CONST.RESULT_LOOKUP[kind]];

		return fn(body);
	}
};

exports[OP.EVENT] =
{
	response: function(body)
	{
		var type = body.readString();
		return this.responses[type](body);
	},

	responses:
	{
		TOPOLOGY_CHANGE: function(body)
		{
			return {
				type: body.readString(),
				addr: body.readInet()
			};
		},

		STATUS_CHANGE: function(body)
		{
			return {
				type: body.readString(),
				addr: body.readInet()
			};
		},

		SCHEMA_CHANGE: function(body)
		{
			return {
				type: body.readString(),
				keyspace: body.readString(),
				table: body.readString()
			};
		}
	}
};

function read_metadata(buffer)
{
	var data = 
	{
		flags: buffer.readInt()
	};

	data.global_table = data.flags & 0x0001;

	var col_count = buffer.readInt();

	if (data.global_table)
	{
		data.global_table = 
		{
			keyspace: buffer.readString(),
			table: buffer.readString()
		};
	}

	data.column_count = col_count;
	data.columns = [];

	for (var i = 0; i < col_count; i++)
	{
		var col = {};

		if (!data.global_table)
		{
			col.keyspace = buffer.readString();
			col.table = buffer.readString();
		}

		col.name = buffer.readString();
		col.type = types.fromBytes(buffer);

		data.columns.push(col);
	}

	return data;
}
