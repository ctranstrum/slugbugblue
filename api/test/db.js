'use strict';

const db = require('../db.js');
const test = require('tape');
const secret = require('./secrets.js');

test('get item from nonexistent table', t => {
  t.plan(1);
  db.use('nonexistent-table');
  db.get({key: 'huh'})
  .then(d => { t.fail(d) })
  .catch(e => {
    if (e.code === 'ResourceNotFoundException') {
      t.pass('returns Resource Not Found error');
    } else {
      t.fail(e);
    }
  });
});

test('get nonexistent item from table', t => {
  t.plan(1);
  db.use(secret.db);
  db.get({key: 'huh'})
  .then(r => { t.deepEqual(r, {}, 'returns empty hash') })
  .catch(e => {
    if (e.code === 'ResourceNotFoundException') {
      t.fail('DynamoDB table not found');
    } else {
      t.fail(e);
    }
  });
});

let wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

let data = { hash: { a: 1, b: 2 }, array: [ 3, 2, 1 ], str: 'testing', num: 17 };
let serial = 0;

test('store data', t => {
  t.plan(2);
  db.put({key: 'Test', data: data})
  .then(() => { t.pass('saved data in db') })
  .catch(e => { t.fail(e) })
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { serial = r.serial; t.deepEqual(r.data, data, 'data pulled from database matches') })
  .catch(e => { t.fail(e) });
});

test('do not overwrite existing record', t => {
  t.plan(3);
  db.put({key: 'Test', data: 'busted', serial: 0 })
  .then(() => { t.fail('should not overwrite') })
  .catch(e => {
    if (e.code === 'ConditionalCheckFailedException') {
      t.pass('returns Conditional Check Failed error');
    } else {
      t.fail(e) 
    }
  })
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { 
    t.deepEqual(r.data, data, 'original data still in database');
    t.equal(r.serial, serial, 'serial number unchanged');
  })
  .catch(e => { t.fail(e) });
});

let newdata = { hash: { hash: { hash: { array: [1, 2, 3], bool: false } } } };
test('overwrite existing record with ttl', t => {
  t.plan(4);
  db.put({key: 'Test', data: newdata, ttl: '5s'})
  .then(() => { t.pass('saved new data in database') })
  .catch(e => { t.fail(e) })
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => {
    t.deepEqual(r.data, newdata, 'record updated');
    t.equal(r.serial, serial + 1, 'serial number incremented');
  })
  .catch(e => { t.fail(e) })
  .then(() => { return wait(6000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { t.deepEqual(r, {}, 'expired record not returned') })
  .catch(e => { t.fail(e) });
});
