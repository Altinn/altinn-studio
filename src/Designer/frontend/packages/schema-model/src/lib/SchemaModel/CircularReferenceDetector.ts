import { SchemaModelBase } from './SchemaModelBase';
import type { NodeMap } from '../../types/NodeMap';
import type { UiSchemaNode, UiSchemaNodes } from '../../types';
import { isDefinition, isReference } from '../utils';
import { ROOT_POINTER } from '../constants';
import { ArrayUtils } from '@studio/pure-functions';

export class CircularReferenceDetector extends SchemaModelBase {
  constructor(nodes: NodeMap) {
    super(nodes);
  }

  public willResultInCircularReferences(
    childSchemaPointer: string,
    parentSchemaPointer: string,
  ): boolean {
    const childDefinitions = this.listDefinitionsWithin(childSchemaPointer);
    const parentDefinitions = this.listAllDefinitionsAbove(parentSchemaPointer);
    return ArrayUtils.hasIntersection(childDefinitions, parentDefinitions);
  }

  private listDefinitionsWithin(schemaPointer: string): string[] {
    const allNodesWithin = this.listAllNodesWithin(schemaPointer);
    return this.filterDefinitions(allNodesWithin);
  }

  private listAllNodesWithin(schemaPointer: string): UiSchemaNode[] {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    const allNodesWithin: UiSchemaNode[] = [node];
    const children = this.getChildNodes(schemaPointer);
    children.forEach((child) => {
      allNodesWithin.push(...this.listAllNodesWithin(child.schemaPointer));
    });
    return allNodesWithin;
  }

  private filterDefinitions(nodes: UiSchemaNodes): string[] {
    const directDefinitions = this.filterDirectDefinitions(nodes);
    const refererredDefinitions = this.filterReferredDefinitions(nodes);
    return [...directDefinitions, ...refererredDefinitions];
  }

  private filterDirectDefinitions(nodes: UiSchemaNodes): string[] {
    return nodes.filter((node) => this.isDefinitionRoot(node)).map((node) => node.schemaPointer);
  }

  private isDefinitionRoot(node: UiSchemaNode): boolean {
    return isDefinition(node) && this.isChildOfRoot(node);
  }

  private isChildOfRoot(node: UiSchemaNode): boolean {
    const parent = this.getParentNode(node.schemaPointer);
    return parent && parent.schemaPointer === ROOT_POINTER;
  }

  private filterReferredDefinitions(nodes: UiSchemaNodes): string[] {
    return nodes.filter(isReference).map((node) => node.reference);
  }

  private listAllDefinitionsAbove(schemaPointer: string): string[] {
    const allNodesAbove = this.listAllNodesAbove(schemaPointer);
    return this.filterDefinitions(allNodesAbove);
  }

  private listAllNodesAbove(schemaPointer: string): UiSchemaNode[] {
    const node = this.getNodeBySchemaPointer(schemaPointer);
    const equivalentPropertyNodeParents = this.getEquivalentPropertyNodeParents(node);
    const allNodesAbove: UiSchemaNode[] = [node];
    equivalentPropertyNodeParents.forEach((parent) => {
      const nodesAbove = this.listAllNodesAbove(parent.schemaPointer);
      allNodesAbove.push(...nodesAbove);
    });
    return allNodesAbove;
  }

  private getEquivalentPropertyNodeParents(node: UiSchemaNode): UiSchemaNode[] {
    const equivalentPropertyNodes = this.getEquivalentPropertyNodes(node);
    return this.getParentsOfNodes(equivalentPropertyNodes);
  }

  private getEquivalentPropertyNodes(node: UiSchemaNode): UiSchemaNode[] {
    const equivalentPropertyNodes: UiSchemaNodes = [node];
    if (this.isDefinitionRoot(node)) {
      const referringNodes = this.getReferringNodes(node.schemaPointer);
      equivalentPropertyNodes.push(...referringNodes);
    }
    return equivalentPropertyNodes;
  }

  private getParentsOfNodes(nodes: UiSchemaNodes): UiSchemaNode[] {
    const parentNodes: UiSchemaNodes = [];
    nodes.forEach((node) => {
      const parent = this.getParentNode(node.schemaPointer);
      if (parent) parentNodes.push(parent);
    });
    return parentNodes;
  }
}
