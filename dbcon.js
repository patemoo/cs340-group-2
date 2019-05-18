var mysql = require('mysql');
var pool = mysql.createPool({
  connectionLimit : 10,
  host            : 'mysql.eecs.oregonstate.edu',
  user            : 'cs340_moorepat',
  password        : '7567',
  database        : 'cs340_moorepat'
});

module.exports.pool = pool;
