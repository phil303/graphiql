const NUM_NODES = 20;
const WIDTH = 600;
const HEIGHT = 600;
const DEPTH = 2;

// evenly spaces nodes along arc
function circleCoord(index, circle, num_nodes) {
  const circumference = circle.node().getTotalLength();
  const sectionLength = circumference / num_nodes;
  const position = sectionLength * index + sectionLength / 2;
  return circle.node().getPointAtLength(circumference - position);
}

// fades out lines that aren't connected to node d
function fadeDisconnected(edges, d, opacity) {
  edges.transition().style('stroke-opacity', function(o) {
    return o.source === d || o.target === d ? 1 : opacity;
  });
}

// returns random int between 0 and num
function getRandomInt(min, max) {
  return Math.floor(Math.random() * max) + min;
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
  return circles;
}

let svg;
let edges;

function runVisualization(containerNode, rootNode, _nodes, _edges) {
  const svg = d3
    .select(containerNode)
    .append('svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT);

  // create the background circles
  const circles = appendCircles(svg, 2);

  // get the number of nodes per circle to space them out evenly on the circle
  const numNodesPerCircle = _nodes.reduce((counts, n) => {
    counts[n.depth] = counts[n.depth] || 0;
    counts[n.depth] += 1;
    return counts;
  }, []);

  const idToIndex = _nodes.reduce((map, n, i) => {
    map[n.id] = i;
    return map;
  }, {});

  // format nodes
  const nodes = _nodes.map((n, i) => {
    const node = { depth: n.depth, id: n.id };

    if (n.depth === 0) {
      return { ...node, x: WIDTH / 2, y: HEIGHT / 2 };
    }

    // one less circle b/c the center node (0 depth) shouldn't have one
    const circle = circles[n.depth - 1];
    // NOTE: circleCoord assumes everything is on the same circle so it gives
    // spacing for NUM_NODES instead of the actual number of nodes on circle.
    const { x, y } = circleCoord(i, circle, numNodesPerCircle[n.depth]);
    return { ...node, x, y };
  });

  // format edges - convert names to node indexes
  const edges = _edges.map(e => ({
    source: idToIndex[e.source],
    target: idToIndex[e.target],
  }));
  console.log('edges', edges);

  const force = d3.layout
    .force()
    .nodes(nodes)
    .links(edges)
    .size([WIDTH, HEIGHT]);

  force.start();

  // setup curved edges
  const svgEdges = svg
    .selectAll('path.node-link')
    .data(edges)
    .enter()
    .append('path')
    .attr('class', 'node-link')
    .attr('d', function(d) {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy);
      return `M ${d
        .source.x},${d.source.y} A ${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    });

  const gnodes = svg
    .selectAll('g.gnode')
    .data(nodes)
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .classed('gnode', true);

  const node = gnodes
    .append('circle')
    .attr('r', 20)
    .attr('class', 'node')
    .on('mouseenter', function(d) {
      fadeDisconnected(svgEdges, d, 0.1);
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
      fadeDisconnected(svgEdges, d, 1);
    });

  const labels = gnodes
    .append('text')
    .attr('dy', 4)
    .text(d => d.id);
}

export default runVisualization;
