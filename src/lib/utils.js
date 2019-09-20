//
// utils.js - Simply utility functions
// Static helper functions
// Ben Coleman, 2017
//

// Simple random ID generator, good enough, with len=6 it's a 1:56 in billion chance of a clash
function makeId(len) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < len; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}


// Hashing function
function hashCode(str) {
  var hash = 0, i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr   = str.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};


// Parsing non-nested commas in a param list is IMPOSSIBLE WITH A REGEX
// This is a brute force parser for comma separated param lists
function parseParams(paramString) {
  var depth = 0;
  var parts = [];
  var lastSplit = 0;
  for(var i in paramString) {
    let c = paramString[i];
    if(c === '(') depth++;
    if(c === ')') depth--;

    let endOfString = i == paramString.length-1;
    if((c === ',' && depth == 0) || endOfString) {
      let endPoint = endOfString ? paramString.length : i;
      parts.push(paramString.substring(lastSplit, endPoint).trim())
      lastSplit = parseInt(i) + 1;
    }
  }
  return parts;
}


// Convert string to Tile Case
function titleCase(str) {
  return str.toLowerCase().split(' ').map(function(word) {
    return word.replace(word[0], word[0].toUpperCase());
  }).join(' ');
}


// Custom string encoder which also encodes single quotes
function encode(str) {
  let temp = encodeURIComponent(str);
  temp = temp.replace(/'/g, '%27');
  return temp;
}

module.exports.makeId = makeId;
module.exports.hashCode = hashCode;
module.exports.parseParams = parseParams;
module.exports.titleCase = titleCase;
module.exports.encode = encode;