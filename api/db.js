'use strict';

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();

// This feels really dumb, because we can compile these on the fly.
// But literal regexes are compiled just once, and it seems a waste
// to compile these thousands of times.
// ttl_regex: regular expressions to help with the ttlify function
const ttl_regex = {
  s: /(\d+)s/,
  m: /(\d+)m/,
  h: /(\d+)h/,
  d: /(\d+)d/,
  M: /(\d+)M/,
  y: /(\d+)y/
};

// table: the dynamodb table that we are using as a database
let table = 'unknown';

/* use
 *
 * select a database (or in this case, a table to use as a database)
 *
 * parameters:
 *   table string [r] the name of the DynamoDB table to use as the database
 *
 * returns:
 *   null
*/
exports.use = (t) => {
  table = t;
};

/* get
 *
 * read data from the database
 *
 * parameters:
 *   options hash [r] includes the following keys
 *     key string [r] the key to your data (expressed as category.uniquekey)
 *     consistent bool [o: false] set to true if you need a consistent read
 *
 * returns:
 *   a promise
 *     resolve(record hash [possibly empty])
 *       key string: the record's unique key
 *       created date: when the record was created
 *       updated date: when the record was last updated
 *       serial number: a number that increases on every write
 *       data hash [o] the json record stored in the database, decoded
 *       ttl number [o] a unix timestamp representing the item's expiration
 *       dataset array [o] set of strings, if stored with this key
 *     reject(error [passed directly from DynamoDB])
*/
exports.get = (options) => {
  let params = {
    TableName: table,
    Key: { PKey: { S: options.key } }
  };
  if (options.consistent) params.ConsistentRead = true;
  return new Promise((resolve, reject) => {
    dynamodb.getItem(params, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      let record = {};
      let expired = false;
      if (data && data.Item) {
        for (let item in data.Item) {
          if (data.Item.hasOwnProperty(item)) {
            if (item === 'PKey') {
              record.key = data.Item.PKey.S;
            } else if (item === 'Data') {
              record.data = JSON.parse(data.Item.Data.S);
            } else if (item === 'DataSet') {
              record.dataset = JSON.parse(data.Item.DataSet.SS);
            } else if (['Created', 'Updated'].includes(item)) {
              record[item.toLowerCase()] = new Date(data.Item[item].S);
            } else if (item === 'Serial') {
              record.serial = dynN(data.Item.Serial.N);
            } else if (item === 'TTL') {
              record.ttl = dynN(data.Item.TTL.N);
              if (record.ttl < Date.now() / 1000) expired = true;
            } else {
              // Hm. We have a rogue field.
              console.log('Rogue field: ' + item + ' (' + data.Item[item] + ')');
            }
          }
        }
      }
      if (expired) record = {};
      resolve(record);
    });
  });
};

/* put
 *
 * write to the database
 *
 * parameters:
 *   options hash [r]:
 *     key string [r] the key to your data, expressed as category.uniquekey
 *     data hash [r] the data to store in the database
 *     serial number [o] include this if you want to write this item only if
 *       the serial number matches what is currently in the database. Use 0
 *       if you want to create a new record but don't want to update an
 *       existing item. To write regardless, omit this key.
 *     ttl string [o] if you want this item to expire, pass a string like
 *         #y#M#d#h#m#s (eg: 7y2s)
 *       for the number of years, months, days, hours, minutes, seconds in
 *       the future to expire the item. Don't use negative values; delete the
 *       item instead. If you are updating an exising item that already has a
 *       TTL and you want to preserve the previous TTL, set this value to 0.
 *       (Or actually, anything that doesn't match the pattern above:
 *        "preserve" or "don't change" or "keep" or "ttl" would work, too.)
 *       If ttl is not passed, then any existing TTL will be removed if the PUT
 *       succeeds.
 *  
 * returns:
 *   a promise
 *     resolve(nothing passed back)
 *     reject(error [passed directly from DynamoDB])
*/
exports.put = (options) => {
  let params = {
    TableName: table,
    Key: { PKey: { S: options.key } },
    ExpressionAttributeNames: {
      '#data': 'Data',
      '#created': 'Created',
      '#updated': 'Updated',
      '#serial': 'Serial'
    },
    ExpressionAttributeValues: {
      ':data': { S: JSON.stringify(options.data) },
      ':now': { S: new Date().toJSON() },
      ':one': { N: '1' },
      ':zero': { N: '0' }
    },
    UpdateExpression: 
      'SET #data = :data, ' +
      '#created = if_not_exists(#created, :now), ' +
      '#updated = :now, ' +
      '#serial = if_not_exists(#serial, :zero) + :one'
  };
  if (options.ttl === undefined) {
    params.ExpressionAttributeNames['#ttl'] = 'TTL';
    params.UpdateExpression += ' REMOVE #ttl';
  } else {
    let expiration = ttlify(options.ttl);
    if (expiration > 0) {
      params.ExpressionAttributeNames['#ttl'] = 'TTL';
      params.ExpressionAttributeValues[':ttl'] = { N: expiration.toString() };
      params.UpdateExpression += ', #ttl = :ttl';
    }
  }
  if (options.serial !== undefined) {
    if (options.serial === 0) {
      params.ConditionExpression = 'attribute_not_exists(PKey)';
    } else {
      params.ExpressionAttributeValues[':serial'] = { N: options.serial };
      params.ConditionExpression = '#serial = :serial';
    }
  }
  return new Promise((resolve, reject) => {
    dynamodb.updateItem(params, err => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

/* dynN
 *
 * DynamoDB stores numbers as strings for compatibility. So let's turn them
 * back into numbers with this hacky little function.
 *
 * parameters:
 *   s string [r]: a number stored as a string
 *
 * returns:
 *   a number
 *
 * error handling:
 *   if you pass something other than a string, we just give it back to you
 *   if you pass a string that isn't a number, you'll get NaN
*/
function dynN (s) {
  return typeof s === 'string' ? +s : s;
}

/* ttlify
 *
 * turn a string like "4h3m12s" into a unix timestamp that long from now
 *
 * parameters:
 *   s string [r]: format #y#M#d#h#m#s (case matters, because <M>onth and <m>inute)
 *
 * returns:
 *   ttl number: a unix timestamp equal to now plus the interval(s) specified
 *
 * error handling:
 *   if you give something other than a string (or an object without a match method)
 *   or if the string you pass doesn't have anything in the right format you get 0
 *   negative numbers are conveniently abs()ed thanks to our regex matches
*/
function ttlify (s) {
  if (typeof s.match !== 'function') return 0; // nope nope nope nope nope
  let seconds = 1;
  let add_time = (unit, previous_in_unit) => {
    seconds *= previous_in_unit;
    let num = s.match(ttl_regex[unit]);
    return num ? num[1] * seconds : 0;
  };
  let sum = add_time('s', 1) + add_time('m', 60) + add_time('h', 60)
          + add_time('d', 24) + add_time('M', 31) + add_time('y', 12);
  return sum ? sum + Math.floor(Date.now() / 1000) : 0;
}
