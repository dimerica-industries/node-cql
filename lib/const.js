exports.VERSION =
{
	REQUEST: 0x01,
	RESPONSE: 0x81
};

exports.FLAG =
{
	COMPRESSION: 0x01,
	TRACING: 0x02
};

exports.OPCODE_REQUEST = 
{
	STARTUP: 0x01, 
	CREDENTIALS: 0x04,
	OPTIONS: 0x05,
	QUERY: 0x07,
	PREPARE: 0x09,
	EXECUTE: 0x0A,
	REGISTER: 0x0B
};

exports.OPCODE_RESPONSE =
{
	ERROR: 0x00,
	READY: 0x02,
	AUTHENTICATE: 0x03,
	SUPPORTED: 0x06,
	RESULT: 0x08,
	EVENT: 0x0C
};

exports.OPCODE = {};

for (var i in exports.OPCODE_REQUEST)
{
	exports.OPCODE[i] = exports.OPCODE_REQUEST[i];
}

for (i in exports.OPCODE_RESPONSE)
{
	exports.OPCODE[i] = exports.OPCODE_RESPONSE[i];
}

exports.CONSISTENCY =
{
	ANY: 0x0000,
	ONE: 0x0001,
	TWO: 0x0002,
	THREE: 0x0003,
	QUORUM: 0x0004,
	ALL: 0x0005,
	LOCAL_QUORUM: 0x0006,
	EACH_QUORUM: 0x0007
};

exports.RESULT =
{
	VOID: 0x0001,
	ROWS: 0x0002,
	SET_KEYSPACE: 0x0003,
	PREPARED: 0x0004,
	SCHEMA_CHANGE: 0x0005
};

exports.STARTUP_OPTIONS =
{
	CQL_VERSION: 'CQL_VERSION',
	COMPRESSION: 'COMPRESSION'
};

exports.RESULT_TYPE =
{
	CUSTOM: 0x0000, //Custom: the value is a [string], see above.
	ASCII: 0x0001, //Ascii
	BIGINT: 0x0002, //Bigint
	BLOB: 0x0003, //Blob
	BOOLEAN: 0x0004, //Boolean
	COUNTER: 0x0005, //Counter
	DECIMAL: 0x0006, //Decimal
	DOUBLE: 0x0007, //Double
	FLOAT: 0x0008, //Float
	INT: 0x0009, //Int
	TEXT: 0x000A, //Text
	TIMESTAMP: 0x000B, //Timestamp
	UUID: 0x000C, //Uuid
	VARCHAR: 0x000D, //Varchar
	VARINT: 0x000E, //Varint
	TIMEUUID: 0x000F, //Timeuuid
	INET: 0x0010, //Inet
	LIST: 0x0020, //List: the value is an [option], representing the type
			// of the elements of the list.
	MAP: 0x0021, //Map: the value is two [option], representing the types of the
			// keys and values of the map
	SET: 0x0022 //Set: the value is an [option], representing the type
			//of the elements of the set
};

exports.ERROR =
{
	SERVER_ERROR: 0x0000,
	PROTOCOL_ERROR: 0x000A,
	BAD_CREDENTIALS: 0x0100,
	UNAVAILABLE_EXCEPTION: 0x1000,
	OVERLOADED: 0x1001,
	IS_BOOTSTRAPPING: 0x1002,
	TRUNCATE_ERROR: 0x1003,
	WRITE_TIMEOUT: 0x1100,
	READ_TIMEOUT: 0x1200,
	SYNTAX_ERROR: 0x2000,
	UNAUTHORIZED: 0x2100,
	INVALID: 0x2200,
	CONFIG_ERROR: 0x2300,
	ALREADY_EXISTS: 0x2400,
	UNPREPARED: 0x2500
};

exports.EVENT =
{
	TOPOLOGY_CHANGE: 'TOPOLOGY_CHANGE',
	STATUS_CHANGE: 'STATUS_CHANGE',
	SCHEMA_CHANGE: 'SCHEMA_CHANGE'
};

var lookups = {};

for (var i in exports)
{
	if (typeof exports[i] == 'object' && !require('util').isArray(exports[i]))
	{
		var obj = lookups[i + '_LOOKUP'] = {};

		for (var j in exports[i])
		{
			obj[exports[i][j]] = j;
		}
	}
}

for (i in lookups)
{
	exports[i] = lookups[i];
}
