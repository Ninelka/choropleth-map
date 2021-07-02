const accidentData = 'https://raw.githubusercontent.com/Ninelka/choropleth-map/dev/Accidents.csv';
const countyData = 'https://raw.githubusercontent.com/VitTuWork/vittuwork.github.io/master/choropleth_ap/map/russia.json';

const width = 1220;
const height = 660;
const padding = 60;

const body = d3.select("section");
const header = d3.select("section").append("header");
const map = body.append("div").attr("class", "map");

const projection = d3.geoAlbers()
    .rotate([-105, 0])
    .center([-10, 65])
    .parallels([52, 64])
    .scale(900) // масштаб картограммы внутри svg элемента
    .translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);

header
    .append("h1")
    .text("Количество происшествий на дорогах РФ")
    .attr("id", "title")
    .style("text-align", "center");

header
    .append("h5")
    .text("*данные с сайта ГИБДД за 2020 год")
    .attr("id", "description")
    .style("text-align", "center");

const tooltip = map
    .append("div")
    .attr("id", "tooltip")
    .attr("class", "tooltip");

function legend(svg, colorScale, dataRange) {
    const group = svg
        .append("g")
        .attr("id", "legend")
        .attr("transform", `translate(${width / 2.5}, 0)`);

    const bottomScale = d3
        .scaleLinear()
        .domain(dataRange)
        .rangeRound([0, 300]);

    const bottomAxis = d3
        .axisBottom(bottomScale)
        .tickFormat(i => Math.floor(i))
        .tickValues(colorScale.domain())
        .tickSize(13);

    group
        .selectAll(".legend-item")
        .data(
            colorScale.range().map(i => {
                i = colorScale.invertExtent(i);
                if (!i[0]) i[0] = bottomScale.domain()[0];
                if (!i[1]) i[1] = bottomScale.domain()[1];
                return i;
            })
        )
        .enter()
        .append("rect")
        .attr("width", d => bottomScale(d[1]) - bottomScale(d[0]))
        .attr("height", 12)
        .attr("x", (d, i) => bottomScale(d[0]))
        .attr("fill", i => colorScale(i[0]))
        .attr("class", "legend-item");

    group
        .append("g")
        .attr("id", "color-axis")
        .attr("class", "color-tick")
        .attr("transform", `translate(0, 0)`)
        .call(bottomAxis);
    return svg;
}

function responsivefy(svg) {
    // measure the container and find its aspect ratio
    const container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style('width'), 10),
        height = parseInt(svg.style('height'), 10),
        aspect = width / height;

    // set viewBox attribute to the initial size
    // control scaling with preserveAspectRatio
    // resize svg on inital page load
    svg.attr('viewBox', `0 0 ${width} ${height}`)
        .attr('preserveAspectRatio', 'xMinYMid')
        .call(resize);

    d3.select(window).on(
        'resize.' + container.attr('id'),
        resize
    );

    // resize the chart
    function resize() {
        const w = parseInt(container.style('width'));
        svg.attr('width', w);
        svg.attr('height', Math.round(w / aspect));
    }
}

d3.json(countyData).then(countyData => {
    d3.csv(accidentData).then(accidentData => {

        const svg = map
            .append("svg")
            .attr("width", width + padding)
            .attr("height", height + padding)
            .call(responsivefy);

        const dataRange = d3.extent(accidentData, i => +i.CarAccidents);  // с помощью "+" переводим данные в числовой тип для корректного нахождения min и max

        const colorScale = d3
            .scaleThreshold()
            .domain(d3.range(dataRange[0], dataRange[1], (dataRange[1] - dataRange[0]) / 8))  // Дробим легенду на 8 равных частей от мин.значения к максимальному
            .range(d3.schemeReds[9]);

        legend(svg, colorScale, dataRange);

        svg
            .append("g")
            .selectAll("path")
            .data(topojson.feature(countyData, countyData.objects.name).features)
            .join("path")
            .attr("d", path)
            .attr("class", "county")
            .attr("data-fips", d => d.properties.ISO_2)
            .attr("data-accident", d => accidentData.find(i => i.RegionCode === d.properties.ISO_2).CarAccidents
            )
            .attr("fill", d => colorScale(accidentData.find(i => i.RegionCode === d.properties.ISO_2).CarAccidents) // Раскрашиваем карту
            )

            .on("mouseover", function (event, d) {
                const target = d3.select(event.target);

                let item = accidentData.find(i => i.RegionCode === d.properties.ISO_2);

                target.attr("stroke", "black");

                tooltip
                    .style("opacity", 0.9)
                    .html(item.RegionName + '<br/><br/>' + 'Инцидентов: ' + item.CarAccidents + '<br/>' + 'Погибло: ' + item.Deaths)
                    .style("left", `${event.pageX}px`)
                    .style("top", `${event.pageY + 28}px`)
                    .attr("data-acccident", item.CarAccidents);
            })

            .on("mouseout", function (event, d) {
                const target = d3.select(event.target);
                target.attr("stroke", "");
                tooltip.style("opacity", 0);
            });
    });
});