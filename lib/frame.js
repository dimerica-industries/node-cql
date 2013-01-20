// https://git-wip-us.apache.org/repos/asf?p=cassandra.git;a=blob_plain;f=doc/native_protocol.spec;hb=refs/heads/cassandra-1.2

//      0         8        16        24        32
//      +---------+---------+---------+---------+
//      | version |  flags  | stream  | opcode  |
//      +---------+---------+---------+---------+
//      |                length                 |
//      +---------+---------+---------+---------+
//      |                                       |
//      .            ...  body ...              .
//      .                                       .
//      .                                       .
//      +----------------------------------------

var Cursor = require('./cursor');

var Frame = function()
{
	this._header = null;

	//req | response
	this.version = 0;

	//frame options
	this.flags = 0;

	//server-client id
	this.id = 0;

	//opcode
	this.opcode = 0;

	this._bodyLength = null;

	//body
	this.body = null;
};

Frame.prototype =
{
	readData: function(buf, cb)
	{
		var hleft = 8 - (this._header ? this._header.length : 0);

		if (!buf.eof() && hleft)
		{
			var sl = buf.slice(Math.min(hleft, buf.length - buf.tell()));
			this._header = this._header ? this._header.concat([sl]) : sl;
		}

		if (!this._header || this._header.length < 8)
		{
			return false;
		}

		this._header.rewind();

		this.version = this._header.readUInt8();
		this.flags = this._header.readUInt8();
		this.id = this._header.readInt8();
		this.opcode = this._header.readUInt8();
		this._bodyLength = this._header.readUInt32BE();

		if (this._bodyLength === 0)
		{
			return true;
		}

		var bleft = this._bodyLength - (this.body ? this.body.length : 0);

		if (!buf.eof() && bleft)
		{
			var slice = buf.slice(Math.min(bleft, buf.length - buf.tell()));
			this.body = this.body ? this.body.concat([slice]) : slice;
		}

		return this._bodyLength == this.body.length;
	},

	encode: function()
	{
		return Cursor(4 + Cursor.lengthBytes(this.body))
			.writeUInt8(this.version)
			.writeUInt8(this.flags)
			.writeInt8(this.id)
			.writeUInt8(this.opcode)
			.writeBytes(this.body)
			.buffer();
	},

	toString: function(enc)
	{ 
		enc = enc || 'hex';
		return 'FRAME[version=' + this.version + ', flags=' + this.flags + ', id=' + this.id + ', opcode=' + this.opcode + ', body=' + (this.body && this.body.toString(enc) || null) + ']';
	}
};

module.exports = Frame;
