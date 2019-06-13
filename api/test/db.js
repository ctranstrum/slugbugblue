'use strict'

const db = require('../db.js')
const test = require('tape')
const secret = require('./secrets.js')

// When the table we are trying to use doesn't exist,
// DynamoDB returns ResourceNotFoundException
test('get record from nonexistent table', t => {
  t.plan(1)
  db.use('nonexistent-table')
  db.get({key: 'huh'})
  .then(d => { t.fail(d) })
  .catch(e => {
    if (e.code === 'ResourceNotFoundException') {
      t.pass('returns Resource Not Found error')
    } else {
      t.fail(e)
    }
  })
})

// When we try to get a record not in the table,
// we get back an empty object
test('get nonexistent record from table', t => {
  t.plan(1)
  db.use(secret.db)
  db.get({key: 'huh'})
  .then(r => { t.deepEqual(r, {}, 'returns empty hash') })
  .catch(e => {
    if (e.code === 'ResourceNotFoundException') {
      t.fail('DynamoDB table not found')
    } else {
      t.fail(e)
    }
  })
})

let wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

let data = { hash: { a: 1, b: 2 }, array: [ 3, 2, 1 ], str: 'testing', num: 17 }
let serial = 0

test('store record', t => {
  t.plan(2)
  db.put({key: 'Test', data: data})
  .then(() => { t.pass('saved record in db') })
  .catch(t.fail)
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => {
    serial = r.serial
    t.deepEqual(r.data, data, 'record pulled from database matches')
  })
  .catch(t.fail)
})

// If we want to update a record only if the serial matches,
// ConditionalCheckFailedException is returned when it's not updated
test('do not overwrite existing record', t => {
  t.plan(3)
  db.put({key: 'Test', data: 'busted', serial: 0 })
  .then(() => { t.fail('should not overwrite') })
  .catch(e => {
    if (e.code === 'ConditionalCheckFailedException') {
      t.pass('returns Conditional Check Failed error')
    } else {
      t.fail(e)
    }
  })
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { 
    t.deepEqual(r.data, data, 'original record still in database')
    t.equal(r.serial, serial, 'serial number unchanged')
  })
  .catch(t.fail)
})

// If we get a record that has already expired, it will be an empty object
let newdata = { hash: { hash: { hash: { array: [1, 2, 3], bool: false } } } }
test('overwrite existing record with ttl', t => {
  t.plan(4)
  db.put({key: 'Test', data: newdata, ttl: '5s'})
  .then(() => { t.pass('saved new record in database') })
  .catch(t.fail)
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => {
    t.deepEqual(r.data, newdata, 'record updated')
    t.equal(r.serial, serial + 1, 'serial number incremented')
  })
  .catch(t.fail)
  .then(() => { return wait(6000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { t.deepEqual(r, {}, 'expired record not returned') })
  .catch(t.fail)
})

// If we don't specify a ttl, the expiration is removed
let ttldata = { bob: ['ate', 'three', 'bananas'] }
test('overwrite expired record with new record without ttl', t => {
  t.plan(2)
  db.put({key: 'Test', data: ttldata})
  .then(() => { t.pass('saved new record in database') })
  .catch(t.fail)
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { t.deepEqual(r.data, ttldata, 'ttl removed properly') })
  .catch(t.fail)
})

// Deleting a record makes it go away, unless we specify an incorrect serial
// number, and then we get a ConditionCheckFailedException
test('delete record', t => {
  t.plan(4)
  db.put({key: 'to.keep', data: data, ttl: '15m'})
  .then(() => { t.pass('saved new record in database') })
  .catch(t.fail)
  .then(() => { return wait(1000) })
  .then(() => { return db.delete({key: 'Test'}) })
  .then(() => { t.pass('deleted record') })
  .catch(t.fail)
  .then(() => { return wait(1000) })
  .then(() => { return db.delete({key: 'to.keep', serial: 9}) })
  .then(() => { t.fail('should not delete incorrect serial') })
  .catch(e => {
    if (e.code === 'ConditionalCheckFailedException') {
      t.pass('returns Conditional Check Failed error')
    } else {
      t.fail(e)
    }
  })
  .then(() => { return wait(1000) })
  .then(() => { return db.get({key: 'Test'}) })
  .then(r => { t.deepEqual(r, {}, 'deleted record not returned') })
  .catch(t.fail)
})

// Testing data sets
test('sets of strings', t => {
  t.plan(6)
  db.put({key: 'Test', set: ['apple', 'banana'], ttl: '15m'})
  .then(() => t.pass('saved two items into a new set'))
  .catch(t.fail)
  .then(() => wait(1000))
  .then(() => db.get({key: 'Test'}))
  .then((r) => {
    if (Array.isArray(r.dataset) && r.dataset.length === 2 && r.dataset.includes('apple')) {
      t.pass('the set now has two items')
    } else {
      t.fail('the dataset is now ' + r.dataset)
    }
  })
  .catch(t.fail)
  .then(() => wait(1000))
  .then(() => db.put({key: 'Test', set: 'cat', ttl: 'ttl'}))
  .then(() => t.pass('added another item into the set'))
  .catch(t.fail)
  .then(() => wait(1000))
  .then(() => db.get({key: 'Test'}))
  .then((r) => {
    if (Array.isArray(r.dataset) && r.dataset.length === 3 && r.dataset.includes('cat')) {
      t.pass('the set now has three items')
    } else {
      t.fail('the dataset is now ' + r.dataset)
    }
  })
  .catch(t.fail)
  .then(() => wait(1000))
  .then(() => db.put({key: 'Test', unset: 'banana', ttl: 'ttl'}))
  .then(() => t.pass('removed an item from the set'))
  .catch(t.fail)
  .then(() => wait(1000))
  .then(() => db.get({key: 'Test'}))
  .then((r) => {
    if (Array.isArray(r.dataset) && r.dataset.length === 2 && !r.dataset.includes('banana')) {
      t.pass('the set now has two items')
    } else {
      t.fail('the dataset is now ' + r.dataset)
    }
  })
  .catch(t.fail)
})
