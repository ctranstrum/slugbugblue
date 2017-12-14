'use strict';

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB();

let table = 'unknown';

/* use
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
 * parameters:
 *   options hash [r] includes the following keys
 *     key string [r] the key to your data (expressed as category.uniquekey)
 *     consistent bool [o: false] set to true if you need a consistent read
 *
 * returns:
 *   a promise
 *     resolve(record hash)
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
 *       item instead.
 *  
 * returns
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
  if (options.ttl) {
    params.ExpressionAttributeNames['#ttl'] = 'TTL';
    params.ExpressionAttributeValues[':ttl'] = { N: ttlify(options.ttl) };
    params.UpdateExpression += ', #ttl = :ttl';
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
*/
function dynN (s) {
  return typeof s === 'string' ? +s : s;
}

/* ttlify
 *
 * We want to take a string in the format #y#M#d#h#m#s and return a unix timestamp
 * that is equal to now plus the intervals specified
 *
*/
function ttlify (s) {
  let ttl = Math.floor(Date.now() / 1000);
  let years = s.match(/([0-9]+)y/);
  let months = s.match(/([0-9]+)M/);
  let days = s.match(/([0-9]+)d/);
  let hours = s.match(/([0-9]+)h/);
  let minutes = s.match(/([0-9]+)m/);
  let seconds = s.match(/([0-9]+)s/);
  let units = 1;
  if (seconds) ttl += seconds[1] * units;
  units *= 60;
  if (minutes) ttl += minutes[1] * units;
  units *= 60;
  if (hours) ttl += hours[1] * units;
  units *= 24;
  if (days) ttl += days[1] * units;
  units *= 31;
  if (months) ttl += months[1] * units;
  units *= 12;
  if (years) ttl += years[1] * units;
  return ttl.toString();
}
