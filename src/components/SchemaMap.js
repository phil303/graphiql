import React from 'react';
import PropTypes from 'prop-types';
import GraphQLSchema from 'graphql';

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
    console.log('this.props.schema', this.props.schema);
    addVisualizationToDom(this.network, this.props.schema._typeMap);
  }

  componentWillUnmount() {
    this.network.innerHTML = '';
  }
}

const OPTIONS = {
  physics: false,
  interaction: {
    hover: true,
    dragNodes: true,
    zoomView: true,
    dragView: true,
  },
  edges: {
    smooth: {
      enabled: true,
      type: 'curvedCW',
      forceDirection: 'vertical',
      roundness: 0.2,
    },
    arrows: 'to',
  },
};

function addVisualizationToDom(networkDomNode, typeMap) {
  const { edges, nodes } = _parseNodes(typeMap);
  const network = new vis.Network(networkDomNode, { edges, nodes }, OPTIONS);

  network.on('hoverNode', ({ node: nodeId }) => {
    const edgeIds = network.getConnectedEdges(nodeId);
    const connectedEdges = edges.get(edgeIds);
    for (let edge of connectedEdges) {
      // if the edge is an incoming connection from a different node
      if (edge.from != nodeId && edge.to === nodeId) {
        continue;
      }

      edges.update({ id: edge.id, label: edge.hiddenLabel });
    }
  });

  network.on('blurNode', () => {
    edges.forEach(edge => edges.update({ id: edge.id, label: '' }));
  });
}

function _parseNodes(typeMap) {
  const edges = [];
  const nodes = [];

  for (let type in typeMap) {
    if (type.startsWith('__')) {
      continue;
    }

    const node = typeMap[type];
    nodes.push({
      id: node.name,
      label: node.name,
      shape: 'box',
    });

    for (let field in node._fields) {
      const toNodeName = node._fields[field].type.name;
      edges.push({
        from: node.name,
        to: toNodeName,
        hiddenLabel: field,
        label: '',
        arrows: 'to',
        font: { align: 'horizontal' },
      });
    }
  }

  return {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges),
  };
}
