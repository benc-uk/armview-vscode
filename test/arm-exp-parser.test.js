const fail = require("assert").fail;
const ARMExpressionParser = require('../out/lib/arm-exp-parser').default;
const fs = require('fs');

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-subset'));

console.log = () => null

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
    it('should extract func names and params with more', () => {
      const exp = "a[parameters('b').c.d.e].f"
      const match = parser.funcCallWithPropertyExtractor(exp);
      expect(match[1]).to.eq('parameters');
      expect(match[2]).to.eq("'b'");
      expect(match[3]).to.eq('.c.d.e');
    })
    it('should extract from complex evals', () => {
      const exp = "[concat(variables('unioned').kd1.kd2, variables('unioned').kd3.kd4)]"
      const match = parser.funcCallWithPropertyExtractor(exp);
      expect(match[1]).to.eq('concat');
      expect(match[2]).to.eq("variables('unioned').kd1.kd2, variables('unioned').kd3.kd4");
      expect(match[3]).to.eq('');
    })
  })
})
