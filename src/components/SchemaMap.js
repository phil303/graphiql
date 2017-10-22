import React from 'react';
import PropTypes from 'prop-types';
import GraphQLSchema from 'graphql';

import runVisualization from './runVisualization';
import { ToolbarButton } from './ToolbarButton';

export class SchemaMap extends React.Component {
  static propTypes = {
    handleBackClick: PropTypes.func.isRequired,
  };

  constructor() {
    super();
    this.network = null;
  }

  render() {
    return (
      <div style={{ width: '100%' }}>
        <div className="topBarWrap">
          <div className="topBar">
            <div className="toolbar">
              <ToolbarButton
                onClick={() => this.props.handleBackClick()}
                title="Back to Explorer"
                label="Back to Explorer"
              />
            </div>
          </div>
        </div>
        <div
          className="network-viz"
          ref={network => (this.network = network)}
        />
      </div>
    );
  }

  componentDidMount() {
    const { _typeMap: typeMap, _queryType: rootNode } = this.props.schema;
    runVisualization(this.network);
    // addVisualizationToDom(this.network, rootNode, typeMap);
  }

  componentWillUnmount() {
    this.network.innerHTML = '';
  }
}

function addVisualizationToDom(networkDomNode, rootNode, typeMap) {
  // const { edges, nodes } = calculateHierarchy(rootNode, typeMap);
}

function calculateHierarchy(rootNode, typeMap, maxDepth = 2) {
  const nodes = {};
  const edges = [];

  function _calculateHierarchy(sourceNode, depth = 0) {
    if (depth > maxDepth) {
      return;
    }

    // depth is calculated relative to the root node, so before new node and
    // therefore new depth is used, check to see if it's pre-existing
    const id = sourceNode.name;
    nodes[id] = nodes[id] || { data: { depth, id } };

    for (let field in sourceNode._fields) {
      const targetNodeName = _findName(sourceNode._fields[field].type);
      const targetNode = typeMap[targetNodeName];

      // only allow edge connections inside the max depth
      if (depth < maxDepth || nodes[targetNodeName]) {
        edges.push({
          data: {
            label: field,
            source: sourceNode.name,
            target: targetNode.name,
          },
        });

        _calculateHierarchy(targetNode, depth + 1);
      }
    }
  }

  _calculateHierarchy(rootNode);

  return {
    nodes: Object.values(nodes),
    edges,
  };
}

function _findName(node) {
  // This helps handle the fact that types can be composited from other
  // "types", e.g., List(NonNull(Int))
  return node.name ? node.name : _findName(node.ofType);
}
