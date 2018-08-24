const api =
  "https://api.coindesk.com/v1/bpi/historical/close.json?start=2018-01-01&end=2018-07-31";

document.addEventListener("DOMContentLoaded", evt => {
  fetch(api)
    .then(response => {
      return response.json();
    })
    .then(data => {
      const parsedData = parseData(data);
      console.log(parsedData);
      drawChart(parsedData);
    });
});

function parseData(data) {
  const parseTime = d3.timeParse("%Y%m%d");
  return Object.entries(data.bpi).map(d => {
    return {
      date: new Date(d[0]),
      value: d[1]
    };
  });
}

function drawChart(data) {
  const svgWidth = window.innerWidth - 60,
    svgHeight = parseInt(window.innerHeight / 2);
  const margin = { top: 20, right: 20, bottom: 80, left: 50 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
  const dateTxt = tooltip.append("span").attr("class", "date-txt");
  const valueTxt = tooltip.append("span").attr("class", "val-txt");

  const svg = d3
    .select("svg.line-chart")
    .attr("width", svgWidth)
    .attr("height", svgHeight);

  // const parseDate = d3.time.format('%d-%b-%y').parse;
  const bisectDate = d3.bisector(d => {
    return d.date;
  }).left;
  const formatValue = d3.format(",.2f");
  const formatCurrency = d => {
    return "$" + formatValue(d);
  };

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  const x = d3.scaleTime().rangeRound([0, width]);

  const y = d3.scaleLinear().rangeRound([height, 0]);

  const line = d3
    .line()
    .x(d => {
      return x(d.date);
    })
    .y(d => {
      return y(d.value);
    });
  x.domain(
    d3.extent(data, d => {
      return d.date;
    })
  );
  y.domain(
    d3.extent(data, d => {
      return d.value;
    })
  );

  g.append("g")
    .attr("class", "axis axis-x")
    .attr("transform", `translate(0, ${height})`)
    .call(customXAxis);

  function customXAxis(g) {
    const dataMonths =
      data
        .map(d => d3.timeFormat("%Y-%m")(d.date))
        .filter((v, i, a) => a.indexOf(v) === i) || [];
    const dateformat = dataMonths.length > 4 ? "%Y-%m" : "%Y-%m-%d";
    const xAxis = d3
      .axisBottom(x)
      .tickSizeInner(5) // the inner ticks will be of size 5
      .tickSizeOuter(0)
      .tickFormat(d3.timeFormat(dateformat)); //"%Y-%m-%d" %m-%d"
    g.call(xAxis);
    g.select(".domain")
      .attr("stroke", "rgba(153, 153, 153, .6)")
      .attr("stroke-width", 1.5);
    // .tick:not(:first-of-type) line
    g.selectAll(".tick line")
      .attr("stroke", "rgba(153, 153, 153, .6)")
      .attr("stroke-width", 1.5);
    g.selectAll(".tick text")
      .attr("fill", "rgba(51, 51, 51, .85)")
      .attr("transform", "translate(0, 20) rotate(45)");
  }

  g.append("g")
    .attr("class", "axis axis-y")
    .call(customYAxis)
    .append("text")
    .attr("fill", "rgb(102, 102, 102, .85)")
    .attr("transform", "translate(2, -26)")
    .attr("y", 7)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .style("font", "14px sans-serif")
    .text("Price ($)");

  g.append("path")
    .data([data])
    .attr("fill", "none")
    .attr("stroke", "rgba(24, 144, 255, .85)")
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("stroke-width", 2)
    .attr("d", line);

  function customYAxis(g) {
    const yAxis = d3
      .axisRight(y)
      .tickSize(width)
      .tickFormat(function(d) {
        // var s = formatNumber(d / 1e6);
        return this.parentNode.nextSibling ? "\xa0" + d : "$" + d;
      });
    g.call(yAxis);
    g.select(".domain").remove();
    // .tick:not(:first-of-type) line
    g.selectAll(".tick line")
      .attr("stroke", "rgba(153, 153, 153, .45)")
      .attr("stroke-dasharray", "3 3")
      .attr("stroke-width", 1.5);
    g.selectAll(".tick text")
      .attr("fill", "rgba(51, 51, 51, .85)")
      .attr("x", 4)
      .attr("dy", -4)
      .attr("transform", "translate(-45, 6)");
  }

  const dot = svg
    .append("g")
    .attr("class", "dot")
    .style("opacity", "0");

  const markLine = svg
    .append("path")
    .attr("class", "mark-line")
    .attr("stroke", "rgba(153, 153, 153, .85)")
    .attr("stroke-width", 1)
    .style("opacity", "0");

  dot
    .append("circle")
    .attr("r", 4.5)
    .style("cursor", "pointer");

  svg
    .append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .attr("transform", `translate(${margin.left}, ${margin.top})`)
    .on("mouseover", () => {
      dot.style("opacity", 1);
      tooltip.style("opacity", 0.9);
      markLine.style("opacity", 1);
    })
    .on("mouseout", () => {
      markLine.style("opacity", 0);
      tooltip.style("opacity", 0);
      dot.style("opacity", 0);
    })
    .on("mousemove", mousemove);

  function mousemove() {
    const x0 = x.invert(d3.mouse(this)[0]),
      i = bisectDate(data, x0, 1),
      d0 = data[i - 1],
      d1 = data[i],
      d = x0 - d0.date > d1.date - x0 ? d1 : d0;
    const posX = x(d.date) + margin.left;
    const posY = y(d.value) + margin.top;
    markLine.attr("transform", `translate(0, 20)`).attr("d", () => {
      var d = "M" + posX + "," + height;
      d += " " + posX + "," + 0;
      return d;
    });

    dot.attr("transform", `translate(${posX}, ${posY})`);
    const tooltipX = posX + 150 > svgWidth ? posX - 100 : posX + 35;
    const tooltipY = posY + 150 > svgHeight ? posY - 30 : posY + 35;
    tooltip.style("left", `${tooltipX}px`).style("top", `${tooltipY}px`);
    dateTxt.text(d3.timeFormat("%Y-%m-%d")(d.date));
    valueTxt.text(formatCurrency(d.value));
  }
}
