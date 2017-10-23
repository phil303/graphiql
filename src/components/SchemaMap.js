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
    runVisualization(this.network, rootNode, typeMap);
  }

  componentWillUnmount() {
    this.network.innerHTML = '';
  }
}
