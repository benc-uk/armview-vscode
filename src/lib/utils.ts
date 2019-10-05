//
// utils.ts - Simple utility functions
// Static helper functions
// Ben Coleman, 2017 & 2019
//

// Hashing function
export function hashCode(str: string): any {
  // var crypto = require('crypto');
  // var key = crypto.createCipher('aes-128-cbc-hmac-sha256', '');
  // key.update(str, 'utf8', 'hex');
  // return key.final('hex');

  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

// Custom string encoder which also encodes single quotes
export function encode(str: string) {
  let temp = encodeURIComponent(str);
  temp = temp.replace(/'/g, '%27');
  return temp;
}
