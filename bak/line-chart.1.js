const api = 'https://api.coindesk.com/v1/bpi/historical/close.json?start=2017-12-31&end=2018-04-01';

document.addEventListener("DOMContentLoaded", (evt) => {
  fetch(api)
  .then(response => {
    return response.json();
  })
  .then(data => {
    const parsedData = parseData(data);
    console.log(parsedData);
    drawChart(parsedData);
  })
});

function parseData(data) {
  return Object.entries(data.bpi).map(d => {
    return {
      date: new Date(d[0]),
      value: d[1]
    };
  });
}

function drawChart(data) {
  const svgWidth = 600, svgHeight = 400;
  const margin = { top: 20, right: 20, bottom: 30, left: 50};
  const width = svgWidth - margin.left - margin.right;
  const height =  svgHeight - margin.top - margin.bottom;

  const svg = d3.select('svg.line-chart')
    .attr('width', svgWidth)
    .attr('height', svgHeight);

  const g = svg.append("g")
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleTime()
    .rangeRound([0, width]);

  const y = d3.scaleLinear()
  .rangeRound([height, 0]);

  const line = d3.line()
    .x(d => { return x(d.date) })
    .y(d => { return y(d.value) })
  x.domain(d3.extent(data, d => {
    return d.date;
  }));
  y.domain(d3.extent(data, d => {
    return d.value;
  }));

  g.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .select('.domain')
    .remove();

  g.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("Price ($)");
  
  g.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "rgba(24, 144, 255, 0.85)")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr("d", line);
}