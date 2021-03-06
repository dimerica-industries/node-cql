var _id = 0;

function id(val)
{
	if (val === void 0)
	{
		return '__undefined__';
	}

	if (val === null)
	{
		return  '__null__';
	}

	var t = typeof val;

	if (t == 'boolean' || t == 'string' || t == 'number')
	{
		return '__' + t + '_' + val + '__';
	}

	//should be 'function' or 'object' now

	if (!val.__cql_id__)
	{
		val.__cql_id__ = '__obj_' + _id++;
	}

	return val.__cql_id__;
}

var CQLSet = function()
{
	this._values = {};
	this.length = 0;
};

CQLSet.prototype.id = id;

CQLSet.prototype.add = function(value)
{
	if (!this.has(value))
	{
		this._values[this.id(value)] = value;
		this.length++;
	}
};

CQLSet.prototype.remove = function(value)
{
	if (this.has(value))
	{
		delete this._values[this.id(value)];
		this.length--;
	}
};

CQLSet.prototype.has = function(value)
{
	return this._values[this.id(value)] !== void 0;
};

CQLSet.prototype.toArray = function()
{
	var arr = [];

	for (var i in this._values)
	{
		arr.push(this._values[i]);
	}

	return arr;
};

var CQLMap = function()
{
	this._keys = new CQLSet();
	this._values = {};
};

CQLMap.prototype.id = id;

CQLMap.prototype.get = function(key)
{
	return this._values[this.id(key)];
};

CQLMap.prototype.set = function(key, value)
{
	this._keys.add(key);
	this._values[this.id(key)] = value;
};

CQLMap.prototype.has = function(key)
{
	return this._values[this.id(key)] !== void 0;
};

CQLMap.prototype.unset = function(key, value)
{
	if (this.has(key))
	{
		this._keys.remove(key);
		delete this._values[this.id(key)];
	}
};

CQLMap.prototype.toObject = function()
{
	var obj = {},
		keys = this._keys.toArray();

	for (var i in keys)
	{
		obj[String(keys[i])] = this.get(keys[i]);
	}

	return obj;
};

module.exports.Set = CQLSet;
module.exports.Map = CQLMap;
