document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('dauChart').getContext('2d');

    // Gradient for the chart areas
    const gradientHistory = ctx.createLinearGradient(0, 0, 0, 400);
    gradientHistory.addColorStop(0, 'rgba(148, 163, 184, 0.4)'); // Slate 400 - faint gray
    gradientHistory.addColorStop(1, 'rgba(148, 163, 184, 0.0)');

    const gradientPrediction = ctx.createLinearGradient(0, 0, 0, 400);
    gradientPrediction.addColorStop(0, 'rgba(15, 23, 42, 0.4)'); // Slate 900 - dark gray
    gradientPrediction.addColorStop(1, 'rgba(15, 23, 42, 0.0)');

    let dauChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'History DAU',
                    data: [],
                    borderColor: '#94a3b8', // Gray
                    backgroundColor: gradientHistory,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Predicted DAU',
                    data: [],
                    borderColor: '#0f172a', // Black
                    backgroundColor: gradientPrediction,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#475569', // Slate 600
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', // Dark Tooltip
                    titleColor: '#f8fafc',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 0,
                    padding: 12,
                    displayColors: true,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US').format(Math.round(context.parsed.y));
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#64748b', // Slate 500
                        maxTicksLimit: 10
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#64748b',
                        callback: function (value) {
                            return value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    const runBtn = document.getElementById('btn-run-projection');

    // Set default dates: Today -> Today + 180 days
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput && endDateInput) {
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + 180);

        startDateInput.value = today.toISOString().split('T')[0];
        endDateInput.value = future.toISOString().split('T')[0];
    }

    // Initial Simulation
    if (runBtn) {
        generateData();

        runBtn.addEventListener('click', () => {
            // Add a loading effect or just regenerate
            runBtn.textContent = 'Calculating...';
            setTimeout(() => {
                generateData();
                runBtn.textContent = 'Run Projection';
            }, 500);
        });
    }

    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (!window.lastForecastData || window.lastForecastData.length === 0) {
                alert('No data to export. Please run a forecast first.');
                return;
            }

            const headers = ['Date', 'Operating system', 'Forecast DAU (total)', 'Growth (Net)', 'Growth (%)', 'Predict new DAU', 'Forecast stock DAU'];
            const csvContent = [
                headers.join(','),
                ...window.lastForecastData.map(row => [
                    row.date,
                    row.os,
                    Math.round(row.total),
                    Math.round(row.growthNet),
                    row.growthPercent.toFixed(2) + '%',
                    Math.round(row.newUsers),
                    Math.round(row.stock)
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `dau_forecast_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Helper to format inputs with commas
    const formatNumberInput = (input) => {
        let value = input.value.replace(/,/g, '');
        if (!isNaN(value) && value !== '') {
            input.value = parseFloat(value).toLocaleString('en-US');
        }
    };

    const inputsToFormat = ['current-dau', 'dnu'];
    inputsToFormat.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // Initial format
            formatNumberInput(input);
            // Format on input
            input.addEventListener('input', (e) => {
                // Remove non-numeric characters except comma (and maybe dot)
                let val = e.target.value.replace(/[^0-9.]/g, '');
                if (val) {
                    const parts = val.split('.');
                    parts[0] = parseInt(parts[0]).toLocaleString('en-US');
                    e.target.value = parts.join('.');
                } else {
                    e.target.value = '';
                }
            });
            input.addEventListener('blur', () => formatNumberInput(input));
        }
    });

    function generateData() {
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');

        if (!startDateInput || !endDateInput) return;

        const start = new Date(startDateInput.value);
        const end = new Date(endDateInput.value);

        // Calculate difference in days
        const diffTime = Math.abs(end - start);
        const daysPrediction = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (!daysPrediction || daysPrediction < 0) return;

        const predictionData = [];
        const labels = [];
        const stockData = [];
        const newUserData = [];

        // Base DAU
        const currentDauInput = document.getElementById('current-dau');
        // Strip commas for calculation
        let currentDAU = currentDauInput ? parseFloat(currentDauInput.value.replace(/,/g, '')) : 50000;

        // Growth parameters
        const lt180Element = document.getElementById('lt180');
        const dnuElement = document.getElementById('dnu');

        // Safety check
        if (!lt180Element || !dnuElement) return;

        const lt180_val = parseFloat(lt180Element.value);
        const dnu_val = parseFloat(dnuElement.value.replace(/,/g, ''));
        const dailyNewUsers = dnu_val;

        // New parameters logic
        const lt30Element = document.getElementById('lt30');
        const decayElement = document.getElementById('decay-rate');

        const decayRateInput = decayElement ? parseFloat(decayElement.value) : 0;
        const decayFactor = 1 - (decayRateInput / 1000);

        // Retention r ≈ 1 - (1 / LT)
        let retentionRate = lt180_val > 0 ? (1 - (1 / lt180_val)) : 0.98;
        retentionRate *= decayFactor;

        // Generate Prediction (No History, just Forecast range)
        let date = new Date(start);

        // Prepare table data
        window.lastForecastData = [];
        const tableBody = document.getElementById('forecast-table-body');
        if (tableBody) tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // Helper to get OS value safely (assuming 3rd select)
        const selects = document.querySelectorAll('select.input-premium');
        const osValue = selects[2] ? selects[2].value : 'All';

        for (let i = 0; i <= daysPrediction; i++) {
            const dateStr = date.toISOString().split('T')[0];
            labels.push(dateStr);

            // Push current value
            predictionData.push(currentDAU);

            // Calculate Components
            const newUsers = dailyNewUsers;
            const stockDAU = Math.max(0, currentDAU - newUsers);

            // Calculate Growth
            let netGrowth = 0;
            let growthPercent = 0;
            if (i > 0) {
                const prevDAU = predictionData[i - 1];
                netGrowth = currentDAU - prevDAU;
                growthPercent = (netGrowth / prevDAU) * 100;
            }

            // Store detailed data
            const rowData = {
                date: dateStr,
                os: osValue,
                total: currentDAU,
                growthNet: netGrowth,
                growthPercent: growthPercent,
                newUsers: newUsers,
                stock: stockDAU
            };
            window.lastForecastData.push(rowData);

            // Create Table Row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td>${osValue}</td>
                <td>${Math.round(currentDAU).toLocaleString()}</td>
                <td class="${netGrowth >= 0 ? 'text-success' : 'text-danger'}">${netGrowth > 0 ? '+' : ''}${Math.round(netGrowth).toLocaleString()}</td>
                <td class="${growthPercent >= 0 ? 'text-success' : 'text-danger'}">${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(2)}%</td>
                <td>${Math.round(newUsers).toLocaleString()}</td>
                <td>${Math.round(stockDAU).toLocaleString()}</td>
            `;
            fragment.appendChild(tr);

            // Calculate next day
            currentDAU = (currentDAU * retentionRate) + dailyNewUsers;
            date.setDate(date.getDate() + 1);
        }

        if (tableBody) tableBody.appendChild(fragment);

        dauChart.data.labels = labels;
        // We only show Prediction now, so clear History or leave it empty
        dauChart.data.datasets[0].data = []; // History empty
        dauChart.data.datasets[1].data = predictionData;

        dauChart.update();

        // Update summary numbers
        const lastVal = predictionData[predictionData.length - 1];
        document.querySelector('.value-highlight').textContent =
            (lastVal / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' K';

        // Update Chart Header Summary
        // Daily New Users (Sync with input)
        document.querySelectorAll('.summary-item .value')[0].textContent =
            parseInt(dnu_val).toLocaleString();
        // Current DAU (Start of period)
        document.querySelectorAll('.summary-item .value')[1].textContent =
            Math.round(predictionData[0]).toLocaleString();
        // Predicted DAU (End of period)
        document.querySelectorAll('.summary-item .value')[2].textContent =
            Math.round(lastVal).toLocaleString();
    }

    // Tab Switching Logic
    const tabs = document.querySelectorAll('.tab');
    const forecastControls = document.getElementById('forecast-controls');
    const forecastResults = document.getElementById('forecast-results');
    const dnuView = document.getElementById('dnu-channel-view');
    const backBtn = document.getElementById('btn-back-dnu');

    if (tabs.length > 0) {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const isDnuTab = tab.getAttribute('data-tab') === 'dnu';
                const isForecastTab = tab.getAttribute('data-tab') === 'forecast';

                // Handle Active State
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (isDnuTab) {
                    // Show DNU View, Hide Forecast
                    if (forecastControls) forecastControls.style.display = 'none';
                    if (forecastResults) forecastResults.style.display = 'none';
                    if (dnuView) dnuView.style.display = 'block';
                } else if (isForecastTab) {
                    // Show Forecast, Hide DNU
                    if (forecastControls) forecastControls.style.display = 'block';
                    if (forecastResults) forecastResults.style.display = 'block';
                    if (dnuView) dnuView.style.display = 'none';
                }
            });
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Find Forecast Tab and click it
            const forecastTab = document.querySelector('.tab[data-tab="forecast"]');
            if (forecastTab) forecastTab.click();
        });
    }

    // Initialize DNU Totals
    updateDnuTotals();

    // Event Delegation for DNU Inputs
    const dnuTable = document.querySelector('.dnu-entry-table');
    if (dnuTable) {
        dnuTable.addEventListener('input', (e) => {
            if (e.target.matches('input')) {
                updateDnuTotals();
            }
        });
    }
});

// Add Row Function (Global Scope)
window.addDnuRow = function (sectionId) {
    const tbody = document.getElementById(sectionId);
    if (!tbody) return;

    const actionRow = tbody.querySelector('.action-row');
    const newRow = document.createElement('tr');

    newRow.innerHTML = `
        <td class="channel-name"><input type="text" class="input-plain" value="New Channel"></td>
        <td><input type="number" class="input-compact dnu-input" value="0"></td>
        <td><input type="number" class="input-compact budget-input" value="0"></td>
        <td><input type="number" class="input-compact cpa-input" value="0" readonly></td>
        <td><input type="number" class="input-compact" value="0"></td>
        <td><input type="number" class="input-compact" value="0"></td>
        <td><input type="number" class="input-compact" value="0"></td>
        <td><input type="number" class="input-compact" value="1.26"></td>
        <td><input type="number" class="input-compact" value="0"></td>
    `;

    tbody.insertBefore(newRow, actionRow);

    // Add delete functionality listener if needed, strictly optional for now as not requested.
};

function updateDnuTotals() {
    const sections = ['section-1-body', 'section-2-body', 'section-3-body', 'section-4-body'];
    let grandDnu = 0;
    let grandBudget = 0;

    // Weighted Accumulators for Grand Total
    let grandWeightedRR = 0;
    let grandWeightedLt30 = 0;
    let grandWeightedLt180 = 0;
    let grandWeightedArpu = 0;
    let grandWeightedRoi = 0;

    sections.forEach(secId => {
        const tbody = document.getElementById(secId);
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr')).filter(row =>
            !row.classList.contains('dnu-section-header') &&
            !row.classList.contains('dnu-col-header') &&
            !row.classList.contains('action-row') &&
            !row.classList.contains('section-total-row')
        );

        let secDnu = 0;
        let secBudget = 0;
        let weightedRR = 0;
        let weightedLt30 = 0;
        let weightedLt180 = 0;
        let weightedArpu = 0;
        let weightedRoi = 0;

        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            // Indices: 0=Name, 1=DNU, 2=Budget, 3=CPA, 4=RR, 5=LT30, 6=LT180, 7=ARPU, 8=ROI
            // Note: In organic section, budget/cpa might be disabled/missing, verify indices.
            // Actually, querying by class/position is safer.

            // Let's assume standard structure for now as per template.
            const dnu = parseFloat(inputs[1]?.value) || 0;
            const budget = parseFloat(inputs[2]?.value) || 0;
            const rr = parseFloat(inputs[4]?.value) || 0;
            const lt30 = parseFloat(inputs[5]?.value) || 0;
            const lt180 = parseFloat(inputs[6]?.value) || 0;
            const arpu = parseFloat(inputs[7]?.value) || 0;
            const roi = parseFloat(inputs[8]?.value) || 0;

            // Update CPA for the row
            const cpaInput = inputs[3];
            if (cpaInput && !cpaInput.hasAttribute('disabled')) { // Only update if not disabled
                const cpa = dnu > 0 ? (budget / dnu) : 0;
                cpaInput.value = cpa.toFixed(2);
            }

            secDnu += dnu;
            secBudget += budget;
            weightedRR += rr * dnu;
            weightedLt30 += lt30 * dnu;
            weightedLt180 += lt180 * dnu;
            weightedArpu += arpu * dnu;
            weightedRoi += roi * dnu;
        });

        // Calculate Section Averages
        const secCpa = secDnu > 0 ? (secBudget / secDnu) : 0;
        const secAvgRR = secDnu > 0 ? (weightedRR / secDnu) : 0;
        const secAvgLt30 = secDnu > 0 ? (weightedLt30 / secDnu) : 0;
        const secAvgLt180 = secDnu > 0 ? (weightedLt180 / secDnu) : 0;
        const secAvgArpu = secDnu > 0 ? (weightedArpu / secDnu) : 0;
        const secAvgRoi = secDnu > 0 ? (weightedRoi / secDnu) : 0;

        // Update Section Total Row
        const totalRow = tbody.querySelector('.section-total-row');
        if (totalRow) {
            totalRow.querySelector('.total-dnu').textContent = Math.round(secDnu).toLocaleString();
            totalRow.querySelector('.total-budget').textContent = Math.round(secBudget).toLocaleString();
            totalRow.querySelector('.total-cpa').textContent = secCpa.toFixed(2);
            totalRow.querySelector('.total-rr').textContent = secAvgRR.toFixed(2);
            totalRow.querySelector('.total-lt30').textContent = secAvgLt30.toFixed(2);
            totalRow.querySelector('.total-lt180').textContent = secAvgLt180.toFixed(2);
            totalRow.querySelector('.total-arpu').textContent = secAvgArpu.toFixed(2);
            totalRow.querySelector('.total-roi').textContent = secAvgRoi.toFixed(2);
        }

        // Accumulate Grand Totals
        grandDnu += secDnu;
        grandBudget += secBudget;
        grandWeightedRR += weightedRR;
        grandWeightedLt30 += weightedLt30;
        grandWeightedLt180 += weightedLt180;
        grandWeightedArpu += weightedArpu;
        grandWeightedRoi += weightedRoi;
    });

    // Calculate Grand Total Averages
    const grandCpa = grandDnu > 0 ? (grandBudget / grandDnu) : 0;
    const grandAvgRR = grandDnu > 0 ? (grandWeightedRR / grandDnu) : 0;
    const grandAvgLt30 = grandDnu > 0 ? (grandWeightedLt30 / grandDnu) : 0;
    const grandAvgLt180 = grandDnu > 0 ? (grandWeightedLt180 / grandDnu) : 0;
    const grandAvgArpu = grandDnu > 0 ? (grandWeightedArpu / grandDnu) : 0;
    const grandAvgRoi = grandDnu > 0 ? (grandWeightedRoi / grandDnu) : 0;

    // Update Grand Total Footer
    document.getElementById('grand-total-dnu').textContent = Math.round(grandDnu).toLocaleString();
    document.getElementById('grand-total-budget').textContent = Math.round(grandBudget).toLocaleString();
    document.getElementById('grand-total-cpa').textContent = grandCpa.toFixed(2);
    document.getElementById('grand-total-rr').textContent = grandAvgRR.toFixed(2);
    document.getElementById('grand-total-lt30').textContent = grandAvgLt30.toFixed(2);
    document.getElementById('grand-total-lt180').textContent = grandAvgLt180.toFixed(2);
    document.getElementById('grand-total-arpu').textContent = grandAvgArpu.toFixed(2);
    document.getElementById('grand-total-roi').textContent = grandAvgRoi.toFixed(2);
}
