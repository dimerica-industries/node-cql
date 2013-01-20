var Cursor = require('./cursor');

//convert a hex num to decimal
//returns a string value 
//
//uses division!
exports.hexdec = function(str)
{
	if (str instanceof Buffer || str instanceof Cursor)
	{
		str = str.toString('hex');
	}

	str = str + "";

	if (/^0*$/.test(str))
	{
		return '0';
	}

	var ret = '';

	while (str !== "0")
	{
		var r = 0,
			x = "";

		for (var i = 0; i < str.length; i++)
		{
			var b = +('0x' + str[i]);
			r = 16 * r + b;

			var diff = Math.floor(r / 10);

			x += diff.toString(16);
			r -= (diff * 10);
		}

		if (x[0] === "0" && x.length > 1)
		{
			x = x.substr(1);
		}

		str = x;
		ret = r + ret;
	}

	return ret;
};
