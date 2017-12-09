'use strict';

const dns = require('dns');
const https = require('http');
const test = require('tape');
const secrets = require('./secrets.js');

function head (f, cb) {
  let website = {
    hostname: secrets.hostname,
    port: 80,
    path: `/${f}`,
    method: 'HEAD',
    timeout: 5000
  };
  https.request(website, cb).end();
}

function contentType (r) {
  return r.headers['content-type'];
}

test('Domain name', t => {
  t.plan(1);
  dns.lookup(secrets.hostname, err => {
    t.notOk(err, 'DNS lookup');
    if (err) {
      test_website({skip:true});
    } else {
      test_website({});
    }
  });
});

function test_website (dnsok) {
  test('Website', dnsok, t => {
    t.plan(2);
    t.timeoutAfter(5000);
    head('', r => {
      t.equals(200, r.statusCode, '200 OK');
      t.equals(contentType(r), 'text/html', 'Content-Type: text/html');
    });
  });

  test('Content-Type', dnsok, t => {
    t.plan(4);
    t.timeoutAfter(9999);
    head('favicon.ico', r => {
      t.equals(contentType(r), 'image/x-icon', '.ico');
    });
    head('modernizr.js', r => {
      t.equals(contentType(r), 'application/javascript', '.js');
    });
    head('mre/slug01.jpg', r => {
      t.equals(contentType(r), 'image/jpeg', '.jpg');
    });
    head('mre/slug03.png', r => {
      t.equals(contentType(r), 'image/png', '.png');
    });
  });
}
