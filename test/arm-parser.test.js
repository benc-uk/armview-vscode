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
      const parameterJson = JSON.stringify({ parameters })
      const expected = { "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentParameters.json#", parameters };
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
        param1: { type: 'object', defaultValue: 1, value: JSON.stringify({ a: 1 }) },
      }
      const expected = {
        param1: { type: 'object', defaultValue: 1, value: { a: 1 } },
      };
      const actual = parser.unStringifyParameter(parameters);
      expect(actual).to.deep.eq(expected)
    })
    it('should unstringify weird jsons', () => {
      const parameters = {
        param1: { type: 'object', defaultValue: 1, value: `{${JSON.stringify({ a: 1 })}}` },
      }
      const expected = {
        param1: { type: 'object', defaultValue: 1, value: { a: 1 } },
      };
      const actual = parser.unStringifyParameter(parameters);
      expect(actual).to.deep.eq(expected)
    })
  })
  describe('extractDependency', () => {
    let parser = null;
    beforeEach(() => {
      parser = new ARMParser('', 'main', null, null);
    })
    it('should extract resolved references', () => {
      const input = "[reference('n2')]"
      const expected = ['n2']
      const actual = parser.extractDependency(input)
      expect(actual).to.deep.eq(expected)
    })
    it('should keep broken deps as is', () => {
      const input = "[reference(parameters('unknown'))]"
      const expected = ["parameters('unknown')"]
      const actual = parser.extractDependency(input)
      expect(actual).to.deep.eq(expected)
    })
    it('should ignore if not reference', () => {
      const input = "[(parameters('unknown')]"
      const expected = []
      const actual = parser.extractDependency(input)
      expect(actual).to.deep.eq(expected)
    })
    it('should resolve known string parameters', () => {
      const input = "[reference(parameters('known'))]"
      const expected = ['someVal']
      parser.template.parameters.known = { defaultValue: 'someVal' }
      const actual = parser.extractDependency(input)
      expect(actual).to.deep.eq(expected)
    })
    it('should ignore superfulous path', () => {
      const input = "[reference(parameters('known')).foo.var]"
      const expected = ['someVal']
      parser.template.parameters.known = { defaultValue: 'someVal' }
      const actual = parser.extractDependency(input)
      expect(actual).to.deep.eq(expected)
    })
    it('should resolve known objectlike parameters', () => {
      const input = "[reference(parameters('known2').a)]"
      const expected = ['b']
      parser.template.parameters.known2 = { defaultValue: { a: 'b' } }
      const actual = parser.extractDependency(input)
      expect(actual).to.deep.eq(expected)
    })
  })
  describe('referencesToDependsOn', () => {
    let parser = null;
    beforeEach(() => {
      parser = new ARMParser('', 'main', null, null);
    })
    it('should resolve references correctly', () => {
      parser.template.resources = [
        {
          name: 'n1',
          someKey1: "[reference('n2')]",
          someKey2: "[reference('n3')]",
        },
        {
          name: 'n2',
          someKey2: "[reference('n3')]",
        },
        {
          name: 'n3'
        }
      ]
      const expected = [
        {
          name: 'n1',
          someKey1: "[reference('n2')]",
          someKey2: "[reference('n3')]",
          dependsOn: ['n2','n3']
        },
        {
          name: 'n2',
          someKey2: "[reference('n3')]",
          dependsOn: ['n3']
        },
        {
          name: 'n3',
          dependsOn: []
        }
      ]
      parser.referencesToDependsOn();
      expect(parser.template.resources).to.deep.eq(expected)
    })
  })
})
