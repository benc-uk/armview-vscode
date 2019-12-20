//
// arm-parser-types.ts - ARM Parser 
// Type definitions, interfaces and basic data classes
// Ben Coleman, 2019
//

export interface Template {
  $schema:    string;
  parameters: Record<string, Parameter>;
  variables:  Record<string, any>;
  resources:  Resource[];
}

export interface Parameter {
  defaultValue: string;
  value: string;
}

export interface Resource {
  id:         string;
  name:       string;
  fqn:        string;         // Not in ARM spec, used by parser to fully qualify resources
  type:       string;
  location:   string;
  tags:       Record<string, any>;
  dependsOn:  string[];
  properties: any;
  sku?:       Record<string, string>;
  kind?:      string;
  resources?: Resource[];
}

// ============================================================

export class CytoscapeNode {
  public group: CytoscapeNodeTypes;
  public data:  CytoscapeNodeData | CytoscapeEdgeData;

  constructor(type: CytoscapeNodeTypes) {
    this.group = type;
    this.data = <CytoscapeNodeData>{};
  }
}

type CytoscapeNodeTypes = 'nodes' | 'edges';

interface CytoscapeNodeData {
  id:       string;
  name:     string;
  img:      string;
  kind:     string;
  type:     string;
  label:    string;
  location: string;
  parent?:  string;
  extra:    Record<string, string>;
}

interface CytoscapeEdgeData {
  id:       string;
  source:   string;
  target:   string;
  parent?:  string;
}
