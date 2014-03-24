d3.json("commits.json", function(error, data) {


var width = 900,
    height = 500;

  var svg = d3.select("#personCentric").append("svg")
              .attr("width", width)
              .attr("height", height);

  var div = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 1e-6);              

  function mouseover() {
    div.transition()
        .style("opacity", 1);
  }

  function mousemove(d) {
    div.text(d.login)
       .style("font-size", "24px")
       .style("text-align", "center")
       .style("left", (d3.event.pageX - 34) + "px")
       .style("top", (d3.event.pageY - 60) + "px");
  }

  function mouseout() {
    div.transition()
        .duration(500)
        .style("opacity", 1e-6);
  }

  var fill = d3.scale.category10();

  var user_dict = {};
  var user_ct = 0;
  var username_dict = {};

  var commit_by_date = {};
  var dates = data.map(function(d) {

    //Setup user_dict to track unique users
    if (d.author.login in user_dict == false) {
      user_dict[d.author.login] = user_ct;
      username_dict[d.sha] = d.author.login;
      user_ct ++;
    }

    d.cat = user_dict[d.author.login];
    d.date = new Date(Date.parse(d.commit.committer.date));
    commit_by_date[d.date] = d.author.login;

    return d.date;

  });

  fill.domain(Object.keys(user_dict));

  var padding = 20;

  var tscale = d3.time.scale()
                 .clamp(true);
  tscale.range([padding, width - padding]);
  tscale.domain([dates[dates.length - 1], dates[0]]);

  var xAxis = d3.svg.axis()
                .scale(tscale)
                .orient("bottom");

  // Add the x-axis.
  x = svg.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(0," + (height - padding) + ")")
         .call(xAxis);

  var commit_dict = {};
  data.map(function(d, i) {
    commit_dict[d.sha] = d.author.login;
  });

  svg.selectAll("rect")
     .data(data)
     .enter().append("rect")
     .attr("x", function(d) {
      return tscale(new Date(Date.parse(d.commit.committer.date)));
     })
     .attr("y", height - 2*padding - 5)
     .attr("width", 3)
     .attr("height", 20)
     .style("fill", function(d) {
      return fill(d.author.login);
     });    

  var make_graph = function(date_min, date_max) {

    node_set = {};
    graph = {nodes:[], links:[]};

    data.map(function(d, i) {
      if (d.date >= date_min && d.date <= date_max) {
        if (d.author.login in node_set == false) {
          node_set[d.author.login] = {idx: user_dict[d.author.login], 
                                      commits: [], login: d.author.login};
          node_set[d.author.login]['commits'].push(d);
        }
        else {
          node_set[d.author.login]['commits'].push(d);
        }
      }
    });

    for (n in node_set) {
      graph.nodes.push(node_set[n]);
    }

    link_set = {};

    for (n in node_set) {
      node_set[n].commits.map(function(c, j) {
        c.parents.map(function(p, k) {
          if (commit_dict[p.sha] in node_set) {
            var source = commit_dict[p.sha];
            var target = n;
            if (source in link_set && target in link_set[source]) {
              link_set[source][target] += 1;
            }
            else if (source in link_set){
              link_set[source][target] = 1;
            }
            else {
              link_set[source] = {};
              link_set[source][target] = 1;
            }
          }
        });
      });
    }

    for (source in link_set) {
      for (target in link_set[source]) {
        graph.links.push({"source": node_set[source].idx, 
                          "target": node_set[target].idx, 
                          "weight": link_set[source][target]});
      }
    }

    return graph;
  }

  graph = make_graph(data[data.length - 1].date, data[0].date);

  // Generate the force layout
  var force = d3.layout.force()
      .size([width, height])
      .charge(-100)
      .linkDistance(250)
      .on("tick", tick)
      .on("start", function(d) {})
      .on("end", function(d) {})

  function tick(d) {

    graph_update(0);
  }

  function random_layout() {
    
    force.stop();

    graph.nodes.forEach(function(d, i) {
      d.x = width/4 + 2*width*Math.random()/4;
      d.y = height/4 + 2*height*Math.random()/4;
    })
    
    graph_update(500);
  }

  function force_layout() {
   force.nodes(graph.nodes)
        .links(graph.links)
        .start();
  }

  function line_layout() {

    force.stop();

    graph.nodes.forEach(function(d, i) {
      d.y = height/2;
    })

    graph_update(500);
  }

  function radial_layout() {

    force.stop();

    var r = height/2;

    var arc = d3.svg.arc()
            .outerRadius(r);

    var pie = d3.layout.pie()
    .sort(function(a, b) { return a.cat - b.cat;})
            .value(function(d, i) { return 1; }); // equal share for each point

    graph.nodes = pie(graph.nodes).map(function(d, i) {
      d.innerRadius = 0;
      d.outerRadius = r;
      d.data.x = arc.centroid(d)[0]+height/2;
      d.data.y = arc.centroid(d)[1]+width/2;
      d.data.endAngle = d.endAngle; 
      d.data.startAngle = d.startAngle; 
      return d.data;
    })

    graph_update(500);
  }

  function node_size() {
    d3.selectAll("circle")
      .attr("r", function(d) {
        if (d.login in node_set) {
          return node_set[d.login].commits.length * .5 + 5;
        }
        else {
          return 0;
        }
      });
  }

  function redraw(date_min, date_max) {

    node.remove();
    link.remove();

    for (n in node_set) {
      node_set[n].commit_number = 0;
    }
    for (s in link_set) {
      for (t in link_set[s]) {
        link_set[s][t] = 0;
      }
    }

    data.map(function(d) {
      if (d.date > date_min && d.date < date_max) {
        node_set[d.author.login].commit_number++;
        d.parents.map(function(p, j) {
          if(typeof link_set[commit_dict[p.sha]] != 'undefined') {
            link_set[commit_dict[p.sha]][commit_dict[d.sha]]++;
          }
        });
      }
    })


    graph.links = [];
    for (source in link_set) {
      for (target in link_set[source]) {
        graph.links.push({"source": node_set[source].idx, 
                          "target": node_set[target].idx, 
                          "weight": link_set[source][target]});
      }
    } 
  
    link = svg.selectAll(".link")
              .data(graph.links)
              .enter().append("line")
              .attr("class", "link")
              .style("stroke-width", function(d) {
                return d.weight * 3;
              })
              .style("stroke", "black");

    node = svg.selectAll(".node")
              .data(graph.nodes)
              .enter()
              .append("g")
              .attr("class", "node");

    node.append("circle")
        .attr("r", function(d) {
          if (node_set[d.login].commit_number > 0) {
            return .5*node_set[d.login].commit_number + 5;
          } else {
            return 0;
          }
        })
        .style("fill", function(d) {
          return fill(d.login);
        })
       .on("mouseover", mouseover)
       .on("mousemove", mousemove)
       .on("mouseout", mouseout);
    
    //node_size(node_set);
    force_layout();
  }

  function graph_update(delay) {

    link.attr("x1", function(d) { return d.target.x; })
        .attr("y1", function(d) { return d.target.y; })
        .attr("x2", function(d) { return d.source.x; })
        .attr("y2", function(d) { return d.source.y; });

    node.attr("transform", function(d) { 
          return "translate("+d.x+","+d.y+")"; 
        });
  }

  d3.select("input[value=\"force\"]").on("click", force_layout);
  d3.select("input[value=\"random\"]").on("click", random_layout);
  d3.select("input[value=\"radial\"]").on("click", radial_layout);
  d3.select("input[value=\"nosize\"]").on("click", function() {
    d3.selectAll("circle").transition().duration(500).attr("r", 5);
  })

  var link = svg.selectAll(".link")
                .data(graph.links)
                .enter().append("line")
                .attr("class", "link")
                .style("stroke-width", function(d) {
                  return d.weight * 3;
                 })
                .style("stroke", "black");

  var node = svg.selectAll(".node")
                .data(graph.nodes)
                .enter()
                .append("g").attr("class", "node")
                .style("fill", function(d) {
                  return fill(d.login);
                });

 node.append("circle")
     .attr("r", 5)
     .on("mouseover", mouseover)
     .on("mousemove", mousemove)
     .on("mouseout", mouseout);

  node_size(node_set);      

  force_layout();

  svg.append("g")
      .attr("class", "brush")
      .call(d3.svg.brush().x(tscale)
      .on("brushstart", brushstart)
      .on("brush", brushmove)
      .on("brushend", brushend))
      .selectAll("rect")
      .attr("height", 75)
      .attr("y", height - 75);

  function brushstart() {
    svg.classed("selecting", true);
  }

  function brushmove() {
    var s = d3.event.target.extent();
    redraw(s[0], s[1]);
  }

  function brushend() {
    svg.classed("selecting", !d3.event.target.empty());
  }

});