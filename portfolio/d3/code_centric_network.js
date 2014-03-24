var width = 900,
    height = 500;

function mouseover() {
  div.transition()
      .style("opacity", 1);
}

function mousemove(d) {
  div.html("name: " + d.commit.author.name + "</br>" +
           "e-mail: " + d.commit.author.email + "</br>" +
           "date: " + d.commit.author.date.slice(0, 10))
     .style("left", (d3.event.pageX - 34) + "px")
     .style("top", (d3.event.pageY - 60) + "px");
}

function mouseout() {
  div.transition()
      .duration(500)
      .style("opacity", 1e-6);
}

var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 1e-6);

var svg = d3.select("#codeCentric").append("svg")
            .attr("width", width)
            .attr("height", height);            


var fill = d3.scale.category10();

var graph = {nodes:[], links:[]};

var node_set = {};

var wscale = d3.scale.linear();
var tscale = d3.time.scale();

var padding = 20;

r = [padding + 100, width - padding];
wscale.range(r);
tscale.range(r);

d3.json("commits.json", function(error, json) {
  if (error) return console.warn(error);
  var data = json;

  wscale.domain([data.length, 0]);

  data.map(function(d, i) {
    d.idx = i;
    graph.nodes.push(d)
    node_set[d.sha] = d;
  });

  var user_dict = {};
  var username_dict = {};
  var user_ct = 0;

  data.map(function(d, i) {
    if (d.author.id in user_dict == false) {
      user_dict[d.author.id] = user_ct;
      username_dict[d.author.id] = d.author.login;
      user_ct ++;
    }
  })

  var unlabel_y_axis = function() {
    svg.selectAll("text").remove();
  }

  var label_y_axis = function() {
    for (u in username_dict) {

      svg.append("text")
         .text(username_dict[u])
         .attr("x", function() {
          return 0;
         })
         .attr("y", function() {
          return height/2 - user_ct*15 + user_dict[u]*30;
         });      

    }    
  }

  graph.nodes.map(function(d) {
    d.cat = user_dict[d.author.id];
  })

  min_date = new Date(Date.parse(graph.nodes[graph.nodes.length - 1].commit.committer.date));
  max_date = new Date(Date.parse(graph.nodes[0].commit.committer.date));

  tscale.domain([min_date, max_date]);  

  data.map(function(d, i) {
    d.parents.map(function(p, j) {
      if (p.sha in node_set) {
        graph.links.push({ "source": node_set[p.sha].idx, "target": node_set[d.sha].idx });
      }
    })
  });

// Generate the force layout
var force = d3.layout.force()
    .size([width, height])
    .charge(-50)
    .linkDistance(10)
    .on("tick", tick)
    .on("start", function(d) {})
    .on("end", function(d) {})

function tick(d) {

  graph_update(0);
}

function random_layout() {
  
  force.stop();

  unlabel_y_axis();

  graph.nodes.forEach(function(d, i) {
    d.x = width/4 + 2*width*Math.random()/4;
    d.y = height/4 + 2*height*Math.random()/4;
  })
  
  graph_update(500);
}

function force_layout() {

  unlabel_y_axis();

 force.nodes(graph.nodes)
      .links(graph.links)
      .on("tick", tick)
      .start();
}

function line_layout() {

  unlabel_y_axis();

  force.stop();

  graph.nodes.forEach(function(d, i) {
    d.y = height/2;
  })

  graph_update(500);
}

function line_even() {

  unlabel_y_axis();
  label_y_axis();

  force.stop();

  graph.nodes.forEach(function(d, i) {
    d.y = height/2 - user_ct*15 + d.cat*30;
    d.x = wscale(i);
  })

  graph_update(500);
}

function line_time() {

  unlabel_y_axis();
  label_y_axis();

  force.stop();

  graph.nodes.forEach(function(d, i) {
    d.y = height/2 - user_ct*15 + d.cat*30;
    d.x = tscale(new Date(Date.parse(d.commit.committer.date)));
  })

  graph_update(500);
}

function line_cat_layout() {

  unlabel_y_axis();

  force.stop();

  graph.nodes.forEach(function(d, i) {
    d.y = height/2 + d.cat*20;
  })

  graph_update(500);
}

function category_color() {
  d3.selectAll("circle").transition().duration(500).style("fill", function(d) { return fill(d.cat); });
}

function category_size() {
  d3.selectAll("circle").transition().duration(500).attr("r", function(d) { return Math.sqrt((d.cat+1)*10); });
}

function graph_update(delay) {

  link.transition().duration(delay)
      .attr("x1", function(d) { return d.target.x; })
      .attr("y1", function(d) { return d.target.y; })
      .attr("x2", function(d) { return d.source.x; })
      .attr("y2", function(d) { return d.source.y; })
      .attr("d", lineData);

  node.transition().duration(delay)
      .attr("transform", function(d) { 
        return "translate("+d.x+","+d.y+")"; 
      });
}

d3.select("input[value=\"force\"]").on("click", force_layout);
d3.select("input[value=\"random\"]").on("click", random_layout);
d3.select("input[value=\"line\"]").on("click", line_layout);
d3.select("input[value=\"even\"]").on("click", line_even);
d3.select("input[value=\"time\"]").on("click", line_time);
d3.select("input[value=\"line_cat\"]").on("click", line_cat_layout);

d3.select("input[value=\"nocolor\"]").on("click", function() {
  d3.selectAll("circle").transition().duration(500).style("fill", "#66CC66");
})

d3.select("input[value=\"color_cat\"]").on("click", category_color);

d3.select("input[value=\"nosize\"]").on("click", function() {
  d3.selectAll("circle").transition().duration(500).attr("r", 5);
})

d3.select("input[value=\"size_cat\"]").on("click", category_size);

// build the arrow.
svg.append("svg:defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
    .enter().append("svg:marker")    // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 4)
    .attr("markerHeight", 4)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

var lineData = function(d) {
  var points = [
    {x: d.source.x, y: d.source.y},
    {x: d.source.x, y: d.target.y},
    {x: d.target.x, y: d.target.y}
  ];
  return line(points)
}

var line = d3.svg.line()
             .x(function(d) { return d.x; })
             .y(function(d) { return d.y; })
             .interpolate("linear");

    // add the links and the arrows
var link = svg.selectAll(".link")
              .data(graph.links)
              .enter().append("path")
              .attr("class", "link")
              .attr("stroke", "black")
              .attr("stroke-width", "2px")
              .attr("shape-rendering", "auto")
              .attr("fill", "none")
              .attr("marker-end", "url(#end)");

var node = svg.selectAll(".node")
              .data(graph.nodes)
              .enter()
              .append("g")
              .attr("class", "node")
              .on("mouseover", mouseover)
              .on("mousemove", function(d) {mousemove(d)})
              .on("mouseout", mouseout);

var emph_user = function(u) {
  d3.selectAll('circle[user="' + u + '"]')
    .attr("r", 10);
}

var de_emph_user = function(u) {
  d3.selectAll('circle[user="' + u + '"]')
    .attr("r", 5);
}

node.append("circle")
    .attr("r", 5)
    .attr("user", function(d) {
      return user_dict[d.author.id];
    })
    .on("mouseover", function(d) {
      emph_user(user_dict[d.author.id]);
    })
    .on("mouseout", function(d) {
      de_emph_user(user_dict[d.author.id]);
    })

force_layout();

});