var perfMon = require('./js/SimplePerfMon.js')

perfMon.Start(20, function () {
    //Optimize for when not visible
    if (!$("#stats").is(":visible")) {
        return;
    }
    var datasets = [];
    var rgbShift = 10;


    cpuPieData.labels = []
    cpuPieData.datasets[0].data = [];
    cpuPieData.datasets[0].backgroundColor = [];
    var cpuUsageTotal = 0;
    var historyLength = perfMon.Cpu.UsageHistory[0].length;
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
        cpuUsageTotal += perfMon.Cpu.Usage(i);
        cpuPieData.labels.push('CPU ' + i)
        cpuPieData.datasets[0].data.push(perfMon.Cpu.Usage(i));
        cpuPieData.datasets[0].backgroundColor.push(rgb);
    }
    var totalPossibleCpuUsage = perfMon.Cpu.Count * 100;
    cpuPieData.labels.push('Idle');
    cpuPieData.datasets[0].data.push(totalPossibleCpuUsage - cpuUsageTotal);
    cpuPieData.datasets[0].backgroundColor.push('rgba(0, 0, 0, 0.3)');
    cpuChartData.datasets = datasets;
    ramChartData.datasets[0].data = perfMon.Memory.UsageHistoryGB
    ramChartData.labels = genrateLabelList("Usage", historyLength);
    cpuChartData.labels = ramChartData.labels;
    ramPieData.datasets[0].data[0] = perfMon.Memory.Usage("GB");
    ramPieData.datasets[0].data[1] = perfMon.Memory.Free("GB");
    var memUsagePercent = getWholePercent(perfMon.Memory.Usage("GB"), perfMon.Memory.Size("GB"));
    ramPieData.datasets[0].backgroundColor[0] = "rgba(" + memUsagePercent + ", 0, " + (255 - memUsagePercent) + ",0.8)"
    cpuChart.update(0);
    ramChart.update(0);
    ramPie.update(0);
    cpuPie.update(0);
});
function getWholePercent(percentFor, percentOf) {
    return Math.floor(percentFor / percentOf * 100);
}
function genrateLabelList(label, length) {
    var labels = [];
    while (length > 0) {
        labels.push(label);
        length--;
    }
    return labels;
}
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
        fillOpacity: .3,
        fill: true,
        borderWidth: 0
    }]
};

var ramPieData = {
    labels: ['Usage', 'Remaining'],
    datasets: [{
        label: 'RAM',
        data: [0, 100],
        backgroundColor: ['rgba(0, 0, 255, 0.8)', 'rgba(0, 0, 0, 0.3)'],
        borderColor: 'rgba(0, 0, 255, 0.3)',
        fill: true,
        borderWidth: 0
    }]
};

var cpuPieData = {
    labels: ['Remaining', 'Usage'],
    datasets: [{
        label: 'CPU',
        data: [0],
        backgroundColor: ['rgba(0, 0, 255, 0.8)', 'rgba(0, 0, 0, 0.3)'],
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
        responsive: true,
        maintainAspectRatio: false,
        legend: {
            display: false
        },
        elements: {
            point: {
                radius: 0
            }
        },
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                    max: 100
                }
            }],
            xAxes: [{
                gridLines: {
                    display: false
                },
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
        elements: {
            point: {
                radius: 0
            }
        },
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                    max: perfMon.Memory.Size("GB")
                }
            }],
            xAxes: [{
                gridLines: {
                    display: false
                },
                ticks: {
                    display: false //this will remove only the label
                }
            }]
        }
    }
});

var ramPiectx = document.getElementById('ramPie').getContext('2d');
var ramPie = new Chart(ramPiectx, {
    type: 'doughnut',
    data: ramPieData,
    options: {
        rotation: (-0.5 * Math.PI) - (90 / 180 * Math.PI),
        maintainAspectRatio: false,
        legend: {
            display: false
        },
        scales: {
            yAxes: [{
                gridLines: {
                    display: false
                },
                ticks: {
                    display: false,
                    beginAtZero: false,

                }
            }],
            xAxes: [{
                gridLines: {
                    display: false
                },
                ticks: {
                    display: false //this will remove only the label
                }
            }]
        }
    }
});

var cpuPiectx = document.getElementById('cpuPie').getContext('2d');
var cpuPie = new Chart(cpuPiectx, {
    type: 'doughnut',
    data: cpuPieData,
    options: {
        rotation: (-0.5 * Math.PI) - (90 / 180 * Math.PI),
        maintainAspectRatio: false,
        legend: {
            display: false
        },
        scales: {
            yAxes: [{
                gridLines: {
                    display: false
                },
                ticks: {
                    display: false,
                    beginAtZero: false,

                }
            }],
            xAxes: [{
                gridLines: {
                    display: false
                },
                ticks: {
                    display: false //this will remove only the label
                }
            }]
        }
    }
});