const WIDTH = 600;
const HEIGHT = 600;

// evenly spaces nodes along arc
function circleCoord(index, circle, numNodes) {
  const circumference = circle.node().getTotalLength();
  const sectionLength = circumference / numNodes;
  const position = sectionLength * index + sectionLength / 2;
  return circle.node().getPointAtLength(circumference - position);
}

// fades out lines that aren't connected to node d
function highlightEdge(edges, d, opacity) {
  edges
    .transition()
    .style('stroke-opacity', o => (o.source === d ? 1 : opacity));
}

function buildColors(numColors) {
  const BASE_COLOR = [240, 240, 240];
  const DECREMENT_RATE = 0.1;

  const colors = [];
  for (let i = 0; i < numColors; i++) {
    const [r, g, b] = BASE_COLOR.map(c => c * (1 - i * DECREMENT_RATE));
    colors.push(d3.rgb(r, g, b));
  }

  // reverse the colors since we want them to get lighter as we go outward
  return colors.reverse();
}

const circles = [];
function appendCircles(svg, numCircles, minRadius = 40, outerPadding = 40) {
  const colors = buildColors(numCircles);

  const totalRadius = WIDTH / 2 - outerPadding - minRadius;
  const circlePadding = totalRadius / numCircles;

  // go from outward in to ensure the smaller circles are above the bigger ones
  for (let i = numCircles; i > 0; i--) {
    const radius = Math.floor(minRadius + i * circlePadding);
    const circle = svg
      .append('circle')
      .attr('cx', WIDTH / 2)
      .attr('cy', HEIGHT / 2)
      .attr('r', radius)
      .style('fill', colors[i - 1]);

    circles.push(circle);
  }
  return circles.reverse();
}

function runVisualization(containerNode, rootNode, typeMap, numCircles = 2) {
  const svg = d3
    .select(containerNode)
    .append('svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT);

  const layout = d3.layout.force().size([WIDTH, HEIGHT]);

  // create the background circles
  const circles = appendCircles(svg, numCircles);
  update(layout, rootNode, typeMap, svg, circles);
}

function nodeKey(n) {
  return `${n.name}-${n.depth}-${n.x}-${n.y}`;
}

function update(layout, rootNode, typeMap, svg, circles) {
  const { nodes, edges } = formatData(rootNode, typeMap, circles);

  layout
    .nodes(nodes)
    .links(edges)
    .start();

  // setup curved edges
  const svgEdges = svg
    .selectAll('path.node-link')
    .data(edges, e => `${e.field}-${nodeKey(e.source)}-${nodeKey(e.target)}`);

  svgEdges
    .enter()
    .append('path')
    .attr('class', 'node-link')
    .attr('d', function(d) {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      return `M ${d
        .source.x} ${d.source.y} A ${dr} ${dr} 0 0 1 ${d.target.x} ${d.target.y}`;
    });

  svgEdges.exit().remove();

  const gnodes = svg.selectAll('g.gnode').data(nodes, nodeKey);

  gnodes
    .enter()
    .append('g')
    .attr('transform', d => {
      console.log('d', d);
      return `translate(${d.x},${d.y})`;
    })
    .classed('gnode', true);

  gnodes.exit().remove();

  const node = gnodes
    .append('circle')
    .attr('r', 20)
    .attr('class', 'node')
    .on('mouseenter', function(d) {
      highlightEdge(svgEdges, d, 0.1);
      node
        .transition()
        .duration(50)
        .attr('r', 20);
      d3
        .select(this)
        .transition()
        .duration(50)
        .attr('r', 22);
    })
    .on('mouseleave', function(d) {
      node
        .transition()
        .duration(50)
        .attr('r', 20);
      highlightEdge(svgEdges, d, 1);
    })
    .on('click', function(d) {
      const node = typeMap[d.name];
      update(layout, node, typeMap, svg, circles);
    });

  const labels = gnodes
    .append('text')
    .attr('dy', 4)
    .text(d => d.name);
}

function formatData(rootNode, typeMap, circles) {
  const { edges: _edges, nodes: _nodes, nodesPerDepth } = calculateHierarchy(
    rootNode,
    typeMap,
    circles.length,
  );

  const numNodesPerDepth = _nodes.reduce((acc, n) => {
    acc[n.depth] = Number.isInteger(acc[n.depth]) ? acc[n.depth] + 1 : 1;
    return acc;
  }, []);

  const counters = [];
  const nodes = _nodes.map(n => {
    if (n.depth === 0) {
      return { name: n.name, x: WIDTH / 2, y: HEIGHT / 2, depth: 0 };
    } else {
      // one less circle b/c the center node (0 depth) shouldn't have one
      const circle = circles[n.depth - 1];
      counters[n.depth] = Number.isInteger(counters[n.depth])
        ? counters[n.depth] + 1
        : 0;
      const { x, y } = circleCoord(
        counters[n.depth],
        circle,
        numNodesPerDepth[n.depth],
      );
      return { name: n.name, depth: n.depth, x, y };
    }
  });

  const nameToIndex = nodes.reduce((map, n, i) => {
    map[n.name] = i;
    return map;
  }, {});

  // format edges - convert names to node indexes
  const edges = _edges.map(e => ({
    source: nameToIndex[e.source],
    target: nameToIndex[e.target],
  }));

  return { nodes, edges };
}

function calculateHierarchy(rootNode, typeMap, maxDepth = 2) {
  const nameToNode = {};

  function _calculateHierarchy(sourceNode, depth = 0) {
    if (depth > maxDepth) {
      return;
    }

    const children = [];
    for (let field in sourceNode._fields) {
      const name = _findName(sourceNode._fields[field].type);
      children.push({ field, name });

      const childNode = typeMap[name];
      _calculateHierarchy(childNode, depth + 1);
    }

    const name = sourceNode.name;
    // depth is calculated relative to the root node, so before new node and
    // therefore new depth is used, check to see if it's pre-existing
    nameToNode[name] = nameToNode[name] || { depth, name, children };
  }

  _calculateHierarchy(rootNode);

  const nodes = Object.values(nameToNode);
  const edges = nodes
    .reduce((acc, n) => {
      return acc.concat(
        n.children.map(child => {
          // only allow edge connections inside the max depth
          return nameToNode[child.name]
            ? { field: child.field, source: n.name, target: child.name }
            : null;
        }),
      );
    }, [])
    .filter(e => e);

  return { nodes, edges };
}

function _findName(node) {
  // This helps handle the fact that types can be composited from other
  // "types", e.g., List(NonNull(Int))
  return node.name ? node.name : _findName(node.ofType);
}

export default runVisualization;

// how to add arrows and labels (assumes small node circles and straight
// lines)
// http://bl.ocks.org/fancellu/2c782394602a93921faff74e594d1bb1
// add arrow definition
// svg
//   .append('svg:defs')
//   .append('svg:marker')
//   .attr('id', 'arrowhead')
//   .attr('viewBox', '-0 -5 10 10')
//   .attr('refX', 20)
//   .attr('refY', 0)
//   .attr('orient', 'auto')
//   .attr('markerWidth', 13)
//   .attr('markerHeight', 13)
//   .attr('xoverflow', 'visible')
//   .append('svg:path')
//   .attr('d', 'M 0,-5 L 10,0 L 0,5')
//   .attr('fill', 'black')
//   .style('stroke','none');
//

//   add .attr('marker-end', 'url(#arrowhead)') to svgEdges
