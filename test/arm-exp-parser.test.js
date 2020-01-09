const fail = require("assert").fail;
const ARMExpressionParser = require('../out/lib/arm-exp-parser').default;
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-subset'));

console.log = function (s) { }

describe('ARMExpressionParser', () => {
  describe('funcCallWithPropertyExtractor', () => {
    beforeEach(() => {
      parser = new ARMExpressionParser(null);
    })
    it('should extract func names and params', () => {
      const exp = "parameters('arg').attr"
      const match = parser.funcCallWithPropertyExtractor(exp);
      expect(match[1]).to.eq('parameters');
      expect(match[2]).to.eq("'arg'");
      expect(match[3]).to.eq('.attr');
    })
    it('should extract func names and params with []', () => {
      const exp = "[parameters('arg').attr]"
      const match = parser.funcCallWithPropertyExtractor(exp);
      expect(match[1]).to.eq('parameters');
      expect(match[2]).to.eq("'arg'");
      expect(match[3]).to.eq('.attr');
    })
    it('should extract func names and params with []/something', () => {
      const exp = "foo-[pending_reference('arg').attr]/bar"
      const match = parser.funcCallWithPropertyExtractor(exp);
      expect(match[1]).to.eq('pending_reference');
      expect(match[2]).to.eq("'arg'");
      expect(match[3]).to.eq('.attr');
    })
  })
})
