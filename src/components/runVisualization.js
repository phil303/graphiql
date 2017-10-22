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

function runVisualization(containerNode) {
  const svg = d3
    .select(containerNode)
    .append('svg')
    .attr('width', WIDTH)
    .attr('height', HEIGHT);

  const circles = appendCircles(svg, 2);

  // nodes returns a [list] of {id: 1, fixed:true}
  const nodes = d3.range(1, NUM_NODES).map(i => {
    const depth = getRandomInt(0, DEPTH);
    // NOTE: circleCoord assumes everything is on the same circle so it gives
    // spacing for NUM_NODES instead of the actual number of nodes on circle.
    const circle = circles[depth];
    const { x, y } = circleCoord(i, circle, NUM_NODES);
    return { x, y, depth, id: i };
  });

  // add center node
  nodes.push({
    id: 0,
    x: WIDTH / 2,
    y: HEIGHT / 2,
    // depth: -1,
  });

  // links returns a [list] of {source: 0, target: 1} (values refer to indices of nodes)
  const links = d3
    .range(NUM_NODES)
    .map(d => ({
      source: getRandomInt(0, NUM_NODES),
      target: getRandomInt(0, NUM_NODES),
    }));

  const force = d3.layout
    .force()
    .nodes(nodes)
    .links(links)
    .size([WIDTH, HEIGHT]);

  force.start();

  // setup curved edges
  const edges = svg
    .selectAll('path.node-link')
    .data(links)
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
      fadeDisconnected(edges, d, 0.1);
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
      fadeDisconnected(edges, d, 1);
    });

  const labels = gnodes
    .append('text')
    .attr('dy', 4)
    .text(d => d.id);
}

export default runVisualization;
