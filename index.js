// https://git-wip-us.apache.org/repos/asf?p=cassandra.git;a=blob_plain;f=doc/native_protocol.spec;hb=refs/heads/cassandra-1.2

var Connection = require('./lib/connection');

exports.connect = function(host, port, keyspace)
{
	var c = new Connection(host, port, keyspace);
	c.connect();

	return c;
};
