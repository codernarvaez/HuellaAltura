const CryptoJS = require('crypto-js');
const apiSecret = '9V9KjInCO8hPYPxfwEBy5bum2yw';
const timestamp = Math.round(new Date().getTime() / 1000);
const stringToSign = `timestamp=${timestamp}${apiSecret}`;
const signature = CryptoJS.SHA1(stringToSign).toString();
console.log({ timestamp, signature });
