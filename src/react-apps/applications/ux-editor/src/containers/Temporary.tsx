import * as React from 'react';
import Tree from './Tree';

export interface ITemporaryProps {
  tree: any;
}

export default class Index extends React.Component<ITemporaryProps, ITemporaryProps> {
  constructor(_props: ITemporaryProps) {
    super(_props);
    this.state = {
      tree: _props.tree,
    };
  }

  public moveItem = (id: string, afterId: string, nodeId: string) => {
    console.log('moving item', id, afterId, nodeId);
    if (id === afterId) {
      return;
    }

    const {tree} = this.state;

    const removeNode = (removeItemId: string, items: any) => {
      for (const node of items) {
        if (node.id === removeItemId) {
          items.splice(items.indexOf(node), 1);
          return;
        }

        if (node.children && node.children.length) {
          removeNode(id, node.children);
        }
      }
    };

    const item = {...this.findItem(id, tree)};
    if (!item.id) {
      return;
    }

    const dest = nodeId ? this.findItem(nodeId, tree).children : tree;

    if (!afterId) {
      removeNode(id, tree);
      dest.push(item);
    } else {
      const index = dest.indexOf(dest.filter((v: any) => v.id === afterId).shift());
      removeNode(id, tree);
      dest.splice(index, 0, item);
    }

    this.setState({tree});
  }

  public findItem = (id: string, items: any) => {
    for (const node of items) {
      if (node.id === id) {
        return node;
      }
      if (node.children && node.children.length) {
        const result: any = this.findItem(id, node.children);
        if (result) {
          return result;
        }
      }
    }

    return false;
  }

  public render() {
    return (
      <div>
        {Object.keys(this.state.tree).map((key: string) =>(
          <Tree
            parent={null}
            items={this.state.tree[key]}
            move={this.moveItem}
            find={this.findItem}
          />
        ))}
      </div>
    );
  }
}
