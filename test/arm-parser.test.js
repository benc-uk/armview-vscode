const fail = require("assert").fail;
const ARMParser = require('../out/lib/arm-parser').default;
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-subset'));

console.log = function (s) { }

describe('ARMParser', () => {
  describe('mergeWithGlobalParameters', () => {
    let parser = null;
    beforeEach(() => {
      parser = new ARMParser('', 'main', null, null);
    })
    it('should merge basic params', () => {
      const parametersOld = { param1: { type: 'string' } }
      const parameters = { param1: { type: 'string', value: 'v1' } }
      const parameterJson = JSON.stringify({parameters})
      const expected = {"$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#",parameters};
      const actual = parser.mergeWithGlobalParameters(parametersOld, parameterJson);
      expect(JSON.parse(actual)).to.deep.eq(expected);
    })
  })
  describe('unStringifyParameter', () => {
    let parser = null;
    beforeEach(() => {
      parser = new ARMParser('', 'main', null, null);
    })
    it('should not change a javascript object', () => {
      const parameters = {
        param1: { type: 'string', value: 'v1' },
        param2: { type: 'object', value: { a: 'b' } }
      }
      const expected = parameters;
      const actual = parser.unStringifyParameter(parameters);
      expect(actual).to.deep.eq(expected)
    })
    it('should unstringify jsons', () => {
      const parameters = {
        param1: { type: 'object', defaultValue:1, value: JSON.stringify({ a: 1 }) },
      }
      const expected = {
        param1: { type: 'object', defaultValue:1, value: { a: 1 } },
      };
      const actual = parser.unStringifyParameter(parameters);
      expect(actual).to.deep.eq(expected)
    })
    it('should unstringify weird jsons', () => {
      const parameters = {
        param1: { type: 'object', defaultValue:1, value: `{${JSON.stringify({ a: 1 })}}` },
      }
      const expected = {
        param1: { type: 'object', defaultValue:1, value: { a: 1 } },
      };
      const actual = parser.unStringifyParameter(parameters);
      expect(actual).to.deep.eq(expected)
    })
  })
})
