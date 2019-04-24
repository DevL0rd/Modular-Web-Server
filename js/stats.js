var perfMon = require('./js/SimplePerfMon.js')

perfMon.Start(20, function () {
    //Optimize for when not visible
    if (!$("#stats").is(":visible")) {
        return;
    }
    var datasets = [];
    var rgbShift = 10;
    for (i in perfMon.Cpu.UsageHistory) {
        var cpu = perfMon.Cpu.UsageHistory[i];
        var rgb = "rgba(" + (rgbShift) + ", 0, " + (255 - rgbShift) + ",0.8)"
        datasets.push({
            label: 'CPU ' + i,
            data: cpu,
            backgroundColor: rgb,
            borderColor: rgb,
            fill: false,
            borderWidth: 0
        });
        rgbShift += 20;
    }
    cpuChartData.datasets = datasets;
    cpuChart.update(0);
    ramChartData.datasets[0].data = perfMon.Memory.UsageHistoryGB
    console.log(perfMon.Memory.UsageHistoryGB)
    ramChart.update(0);
});

var cpuChartData = {
    labels: ['Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage'],
    datasets: [{
        label: 'CPU',
        data: [0],
        backgroundColor: 'rgba(0, 0, 255, 0.8)',
        borderColor: 'rgba(0, 0, 255, 0.8)',
        borderWidth: 0
    }]
};

var ramChartData = {
    labels: ['Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage', 'Usage'],
    datasets: [{
        label: 'RAM',
        data: [0],
        backgroundColor: 'rgba(0, 0, 255, 0.8)',
        borderColor: 'rgba(0, 0, 255, 0.3)',
        fill: true,
        borderWidth: 0
    }]
};

var cpuChartctx = document.getElementById('cpuChart').getContext('2d');
var cpuChart = new Chart(cpuChartctx, {
    type: 'line',
    data: cpuChartData,
    options: {
        maintainAspectRatio: false,
        legend: {
            display: false
        },
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }],
            xAxes: [{
                ticks: {
                    display: false //this will remove only the label
                }
            }]
        }
    }
});

var ramChartctx = document.getElementById('ramChart').getContext('2d');
var ramChart = new Chart(ramChartctx, {
    type: 'line',
    data: ramChartData,
    options: {
        maintainAspectRatio: false,
        legend: {
            display: false
        },
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }],
            xAxes: [{
                ticks: {
                    display: false //this will remove only the label
                }
            }]
        }
    }
});
ramChart.update();