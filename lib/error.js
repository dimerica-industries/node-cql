var CONST = require('./const'),
	ERROR = CONST.ERROR,
	LOOKUP = CONST.ERROR_LOOKUP;

function toString(buf)
{
	return buf.toString();
}

exports[ERROR.SERVER_ERROR] = toString;
exports[ERROR.PROTOCOL_ERROR] = toString;
exports[ERROR.BAD_CREDENTIALS] = toString;

exports[ERROR.UNAVAILABLE_EXCEPTION] = function(buf)
{
	var consistency = CONST.CONSISTENCY_LOOKUP[buf.readShort()],
		required = buf.readInt(),
		alive = buf.readInt();

	return "Query with consistency level " + consistency + " specified, only " + alive + " replica available - " + required + " needed";
};

exports[ERROR.OVERLOADED] = toString;
exports[ERROR.IS_BOOTSTRAPPING] = toString;
exports[ERROR.TRUNCATE_ERROR] = toString;

exports[ERROR.WRITE_TIMEOUT] = function(buf)
{
	var consistency = CONST.CONSISTENCY_LOOKUP[buf.readShort()],
		received = buf.readInt(),
		blockFor = buf.readInt(),
		writeType = buf.readString();	

	return "Write timeout for " + writeType + " query with consistency level " + consistency + ". " + received + " of " + " " + blockFor + " nodes acknowledged request"; 
};

exports[ERROR.READ_TIMEOUT] = function(buf)
{
	var consistency = CONST.CONSISTENCY_LOOKUP[buf.readShort()],
		received = buf.readInt(),
		blockFor = buf.readInt(),
		dataPresent = buf.readInt();
};

exports[ERROR.SYNTAX_ERROR] = toString;
exports[ERROR.UNAUTHORIZED] = toString;
exports[ERROR.INVALID] = toString;
exports[ERROR.CONFIG_ERROR] = toString;

exports[ERROR.ALREADY_EXISTS] = function(buf)
{
	var ks = buf.readString(),
		table = buf.readString();

	if (table)
	{
		return "Cannot create table " + ks + "." + table + ". It already exists.";
	}
	
	return "Cannot create keyspace " + ks + ". It already exists.";
};

exports[ERROR.UNPREPARED] = toString;
