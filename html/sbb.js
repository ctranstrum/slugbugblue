'use strict';

const imgs = [
  { src: 'mre/slug01.jpg', width: 500, height: 379, class: 'whimsical' },
  { src: 'mre/slug02.png', width: 418, height: 294 },
  { src: 'mre/slug03.png', width: 364, height: 204, class: 'whimsical' },
  { src: 'mre/slug04.jpg', width: 500, height: 375, class: 'whimsical' },
  { src: 'mre/slug05.jpg', width: 500, height: 375, class: 'whimsical' }
];

const logo = Math.floor(Math.random() * imgs.length);

const v = new Vue({
  el: '#sbb',
  data: {
    imgs: imgs,
    logo: logo
  }
});
