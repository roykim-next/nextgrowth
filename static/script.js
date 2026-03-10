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

    // Set default dates: 2026-01-26 -> 2026-07-25 (180 days)
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput && endDateInput) {
        // Default to 2026-01-26 ~ 2026-07-25 if not set
        if (!startDateInput.value) {
            startDateInput.value = '2026-01-26';
        }
        if (!endDateInput.value) {
            endDateInput.value = '2026-07-25';
        }
    }

    // Auto-calculate LT30 when DNU D30 RR changes (only LT30 updates)
    function updateLT30() {
        const dnuD1RRInput = document.getElementById('dnu-d1-rr');
        const dnuD30RRInput = document.getElementById('dnu-d30-rr');
        const dnuD180RRInput = document.getElementById('dnu-d180-rr');
        const lt30Element = document.getElementById('lt30');

        if (dnuD1RRInput && dnuD30RRInput && dnuD180RRInput && lt30Element) {
            const dnuD1RR = parseFloat(dnuD1RRInput.value) || 0;
            const dnuD30RR = parseFloat(dnuD30RRInput.value) || 0;
            const dnuD180RR = parseFloat(dnuD180RRInput.value) || 0;

            if (dnuD30RR > 0) {
                const lt30 = calculateLT30(dnuD1RR, dnuD30RR, dnuD180RR);
                lt30Element.value = lt30.toFixed(2);
            }
        }
    }

    // Auto-calculate LT180 when DNU D180 RR changes (only LT180 updates)
    function updateLT180() {
        const dnuD1RRInput = document.getElementById('dnu-d1-rr');
        const dnuD30RRInput = document.getElementById('dnu-d30-rr');
        const dnuD180RRInput = document.getElementById('dnu-d180-rr');
        const lt180Element = document.getElementById('lt180');

        if (dnuD1RRInput && dnuD30RRInput && dnuD180RRInput && lt180Element) {
            const dnuD1RR = parseFloat(dnuD1RRInput.value) || 0;
            const dnuD30RR = parseFloat(dnuD30RRInput.value) || 0;
            const dnuD180RR = parseFloat(dnuD180RRInput.value) || 0;

            if (dnuD180RR > 0) {
                const lt180 = calculateLT180(dnuD1RR, dnuD30RR, dnuD180RR);
                lt180Element.value = lt180.toFixed(2);
            }
        }
    }

    // Add event listeners for auto-calculation
    const dnuD1RRInput = document.getElementById('dnu-d1-rr');
    const dnuD30RRInput = document.getElementById('dnu-d30-rr');
    const dnuD180RRInput = document.getElementById('dnu-d180-rr');
    
    if (dnuD1RRInput) {
        dnuD1RRInput.addEventListener('input', () => {
            // D1 RR 변경 시에는 둘 다 업데이트 (DAU 계산에 영향)
            updateLT30();
            updateLT180();
        });
    }
    if (dnuD30RRInput) {
        dnuD30RRInput.addEventListener('input', updateLT30); // D30 변경 시 LT30만 업데이트
    }
    if (dnuD180RRInput) {
        dnuD180RRInput.addEventListener('input', updateLT180); // D180 변경 시 LT180만 업데이트
    }

    // Initial LT calculation
    updateLT30();
    updateLT180();

    // Save and Load functionality
    let savedSettings = null;
    let isLocked = false;

    function saveForecastSettings() {
        const settings = {
            startDate: document.getElementById('start-date')?.value || '',
            endDate: document.getElementById('end-date')?.value || '',
            appId: document.querySelector('select.input-premium')?.value || '',
            country: document.querySelectorAll('select.input-premium')[1]?.value || '',
            os: document.querySelectorAll('select.input-premium')[2]?.value || '',
            currentDAU: document.getElementById('current-dau')?.value || '',
            dnu: document.getElementById('dnu')?.value || '',
            dnuD1RR: document.getElementById('dnu-d1-rr')?.value || '',
            dnuD30RR: document.getElementById('dnu-d30-rr')?.value || '',
            dnuD180RR: document.getElementById('dnu-d180-rr')?.value || '',
            existingMonthlyRetention: document.getElementById('existing-monthly-retention')?.value || '',
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('dauForecastSettings', JSON.stringify(settings));
        savedSettings = settings;
        
        // Save only - don't lock, and unlock if previously locked
        if (isLocked) {
            isLocked = false;
            unlockInputFields();
        }
        
        // Update button text temporarily
        const saveBtn = document.getElementById('btn-save');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saved!';
            setTimeout(() => {
                saveBtn.textContent = originalText;
            }, 2000);
        }
        
        alert('Forecast settings saved successfully!');
    }

    function lockInputFields() {
        const inputIds = ['start-date', 'end-date', 'current-dau', 'dnu', 'dnu-d1-rr', 
                         'dnu-d30-rr', 'dnu-d180-rr', 'existing-monthly-retention'];
        
        inputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.readOnly = true;
                input.style.backgroundColor = '#f1f5f9';
                input.style.cursor = 'not-allowed';
            }
        });
        
        // Lock select elements
        const selects = document.querySelectorAll('select.input-premium');
        selects.forEach(select => {
            select.disabled = true;
            select.style.backgroundColor = '#f1f5f9';
            select.style.cursor = 'not-allowed';
        });
    }

    function unlockInputFields() {
        const inputIds = ['start-date', 'end-date', 'current-dau', 'dnu', 'dnu-d1-rr', 
                         'dnu-d30-rr', 'dnu-d180-rr', 'existing-monthly-retention'];
        
        inputIds.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.readOnly = false;
                input.style.backgroundColor = '#ffffff';
                input.style.cursor = 'text';
            }
        });
        
        // Unlock select elements
        const selects = document.querySelectorAll('select.input-premium');
        selects.forEach(select => {
            select.disabled = false;
            select.style.backgroundColor = '#ffffff';
            select.style.cursor = 'pointer';
        });
    }

    function restoreSavedValues() {
        if (!savedSettings) return;
        
        if (savedSettings.startDate) document.getElementById('start-date').value = savedSettings.startDate;
        if (savedSettings.endDate) document.getElementById('end-date').value = savedSettings.endDate;
        if (savedSettings.appId) {
            const appIdSelect = document.querySelector('select.input-premium');
            if (appIdSelect) appIdSelect.value = savedSettings.appId;
        }
        if (savedSettings.country) {
            const countrySelect = document.querySelectorAll('select.input-premium')[1];
            if (countrySelect) countrySelect.value = savedSettings.country;
        }
        if (savedSettings.os) {
            const osSelect = document.querySelectorAll('select.input-premium')[2];
            if (osSelect) osSelect.value = savedSettings.os;
        }
        if (savedSettings.currentDAU) document.getElementById('current-dau').value = savedSettings.currentDAU;
        if (savedSettings.dnu) document.getElementById('dnu').value = savedSettings.dnu;
        if (savedSettings.dnuD1RR) document.getElementById('dnu-d1-rr').value = savedSettings.dnuD1RR;
        if (savedSettings.dnuD30RR) document.getElementById('dnu-d30-rr').value = savedSettings.dnuD30RR;
        if (savedSettings.dnuD180RR) document.getElementById('dnu-d180-rr').value = savedSettings.dnuD180RR;
        if (savedSettings.existingMonthlyRetention) document.getElementById('existing-monthly-retention').value = savedSettings.existingMonthlyRetention;
        
        // LT values will be recalculated automatically
        updateLT30();
        updateLT180();
    }

    function loadForecastSettings() {
        const saved = localStorage.getItem('dauForecastSettings');
        if (!saved) return false;
        
        try {
            savedSettings = JSON.parse(saved);
            restoreSavedValues();
            // Don't lock on load - just restore values
            isLocked = false;
            
            return true;
        } catch (e) {
            console.error('Error loading saved settings:', e);
            return false;
        }
    }

    function clearSavedSettings() {
        if (confirm('Are you sure you want to clear saved settings? This will unlock all fields.')) {
            localStorage.removeItem('dauForecastSettings');
            savedSettings = null;
            isLocked = false;
            unlockInputFields();
            
            // Update button state
            const saveBtn = document.getElementById('btn-save');
            if (saveBtn) {
                saveBtn.textContent = 'Save';
                saveBtn.style.opacity = '1';
                saveBtn.disabled = false;
            }
            
            alert('Saved settings cleared. All fields are now unlocked.');
        }
    }

    // Save button event listener
    const saveBtn = document.getElementById('btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            saveForecastSettings();
        });
    }

    // Load saved settings on page load
    const loaded = loadForecastSettings();
    if (loaded) {
        console.log('Saved forecast settings loaded and locked');
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

            const headers = ['Date', 'Operating system', 'Forecast DAU (total)', 'Growth (Net)', 'Growth (%)', 'Predict new DAU'];
            const csvContent = [
                headers.join(','),
                ...window.lastForecastData.map(row => [
                    row.date,
                    row.os,
                    Math.round(row.total),
                    Math.round(row.growthNet),
                    row.growthPercent.toFixed(2) + '%',
                    Math.round(row.newUsers)
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

    // Share button - Export chart as image
    const shareBtn = document.getElementById('btn-share');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            if (!dauChart || !dauChart.data || dauChart.data.datasets[1].data.length === 0) {
                alert('No chart data to share. Please run a forecast first.');
                return;
            }

            try {
                // Get chart as base64 image
                const imageUrl = dauChart.toBase64Image('image/png', 1.0);
                
                // Create download link
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `dau_forecast_chart_${new Date().toISOString().split('T')[0]}.png`;
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Also try to copy to clipboard (optional, may not work in all browsers)
                if (navigator.clipboard && navigator.clipboard.write) {
                    fetch(imageUrl)
                        .then(res => res.blob())
                        .then(blob => {
                            const item = new ClipboardItem({ 'image/png': blob });
                            return navigator.clipboard.write([item]);
                        })
                        .then(() => {
                            alert('Chart image saved and copied to clipboard!');
                        })
                        .catch(() => {
                            alert('Chart image saved! (Clipboard copy not available in this browser)');
                        });
                } else {
                    alert('Chart image saved!');
                }
            } catch (error) {
                console.error('Error exporting chart:', error);
                alert('Error exporting chart. Please try again.');
            }
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

    // Calculate retention rate at day t using Shifted Power Law: R(t) = (t+1)^(-b)
    // R(0) = 1, R(30) = D30/100, R(180) = D180/100
    // Uses D30 and D180 to fit the curve and derive decay exponent b
    function calculateRetentionRate(d30RR, d180RR, day) {
        if (day === 0) return 1.0;
        if (day < 0) return 0;
        
        if (d30RR <= 0 || d180RR <= 0) return 0;
        
        // Shifted Power Law: R(t) = (t+1)^(-b)
        // R(30) = 31^(-b) = D30/100
        // R(180) = 181^(-b) = D180/100
        
        // Calculate b from D30 and D180 using least squares approach
        const r30 = d30RR / 100;
        const r180 = d180RR / 100;
        
        // b30 = -log(r30) / log(31)
        // b180 = -log(r180) / log(181)
        // Use weighted average based on time points
        const b30 = -Math.log(r30) / Math.log(31);
        const b180 = -Math.log(r180) / Math.log(181);
        
        // Weighted average: weight by inverse of log(time) to give more weight to D30
        const weight30 = 1 / Math.log(31);
        const weight180 = 1 / Math.log(181);
        const b = (b30 * weight30 + b180 * weight180) / (weight30 + weight180);
        
        // Calculate retention at day t: R(t) = (t+1)^(-b)
        const retention = Math.pow(day + 1, -b);
        return Math.max(0, Math.min(1, retention)); // Clamp between 0 and 1
    }

    // Calculate decay exponent b from D30 and D180 using Shifted Power Law
    // R(t) = (t+1)^(-b)
    // R(30) = 31^(-b) = D30/100
    // R(180) = 181^(-b) = D180/100
    function calculateDecayExponent(d1RR, d30RR, d180RR) {
        if (d1RR <= 0 || d180RR <= 0) return 0;

        const r1 = d1RR / 100;
        const r180 = d180RR / 100;

        // Two-segment model: R(t) = r1 * t^(-b) for t >= 1
        // Anchor D1 and D180: r1 * 180^(-b) = r180
        // => b = -log(r180 / r1) / log(180)
        if (r180 >= r1) return 0;
        const b = -Math.log(r180 / r1) / Math.log(180);

        return b;
    }

    // Calculate LT30 using two-segment model:
    // R(0) = 1.0, R(t) = (D1/100) * t^(-b) for t >= 1
    // b anchored to D1 and D180: (D1/100) * 180^(-b) = D180/100
    function calculateLT30(d1RR, d30RR, d180RR) {
        if (d1RR <= 0 || d180RR <= 0) return 0;

        const r1 = d1RR / 100;
        const r180 = d180RR / 100;
        if (r180 >= r1) return 0;
        const b = -Math.log(r180 / r1) / Math.log(180);

        // Day 0: R(0) = 1.0, Day t >= 1: R(t) = r1 * t^(-b)
        let sum = 1.0;
        for (let t = 1; t < 30; t++) {
            sum += r1 * Math.pow(t, -b);
        }

        return sum;
    }

    // Calculate LT180 using two-segment model:
    // R(0) = 1.0, R(t) = (D1/100) * t^(-b) for t >= 1
    // b anchored to D1 and D180: (D1/100) * 180^(-b) = D180/100
    function calculateLT180(d1RR, d30RR, d180RR) {
        if (d1RR <= 0 || d180RR <= 0) return 0;

        const r1 = d1RR / 100;
        const r180 = d180RR / 100;
        if (r180 >= r1) return 0;
        const b = -Math.log(r180 / r1) / Math.log(180);

        // Day 0: R(0) = 1.0, Day t >= 1: R(t) = r1 * t^(-b)
        let sum = 1.0;
        for (let t = 1; t < 180; t++) {
            sum += r1 * Math.pow(t, -b);
        }

        return sum;
    }

    // Calculate LT (Lifetime) using discrete model
    // Uses D1 and Dx (where x is 30 or 180) to calculate LT
    function calculateLT(d1RR, dXRR, x, maxDays) {
        if (d1RR <= 0 || dXRR <= 0) return 0;
        
        // Retention function R(t) = a * t^(-b)
        const a = d1RR / 100;
        let b = 0;
        
        // Calculate b from D1 and Dx
        if (dXRR > 0 && dXRR < d1RR) {
            b = -Math.log(dXRR / d1RR) / Math.log(x);
        } else if (dXRR >= d1RR) {
            b = 0;
        } else {
            b = 2.0;
        }
        
        // Discrete sum: Day 0 (1.0) + Day 1 to maxDays-1
        let sum = 1.0; // Day 0
        
        for (let day = 1; day < maxDays; day++) {
            const retention = a * Math.pow(day, -b);
            sum += retention;
        }
        
        return sum;
    }

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

        // Get input values
        const currentDauInput = document.getElementById('current-dau');
        const dnuInput = document.getElementById('dnu');
        const dnuD1RRInput = document.getElementById('dnu-d1-rr');
        const dnuD30RRInput = document.getElementById('dnu-d30-rr');
        const dnuD180RRInput = document.getElementById('dnu-d180-rr');
        const existingMonthlyRetentionInput = document.getElementById('existing-monthly-retention');

        // Safety check
        if (!dnuInput || !dnuD1RRInput || !dnuD30RRInput || !dnuD180RRInput || !existingMonthlyRetentionInput) return;

        let currentDAU = currentDauInput ? parseFloat(currentDauInput.value.replace(/,/g, '')) : 0;
        const dnu = parseFloat(dnuInput.value.replace(/,/g, '')) || 0;
        const dnuD1RR = parseFloat(dnuD1RRInput.value) || 0;
        const dnuD30RR = parseFloat(dnuD30RRInput.value) || 0;
        const dnuD180RR = parseFloat(dnuD180RRInput.value) || 0;
        const existingMonthlyRetention = parseFloat(existingMonthlyRetentionInput.value) || 0;

        // Calculate LT30 and LT180 using Shifted Power Law model
        // R(t) = (t+1)^(-b), where b is derived from D30 and D180
        const lt30 = calculateLT30(dnuD1RR, dnuD30RR, dnuD180RR);
        const lt180 = calculateLT180(dnuD1RR, dnuD30RR, dnuD180RR);

        // Update LT fields (read-only)
        const lt30Element = document.getElementById('lt30');
        const lt180Element = document.getElementById('lt180');
        if (lt30Element) lt30Element.value = lt30.toFixed(2);
        if (lt180Element) lt180Element.value = lt180.toFixed(2);

        // Calculate daily retention for existing users (monthly retention to daily)
        const existingDailyRetention = Math.pow(existingMonthlyRetention / 100, 1 / 30);

        // Store cohorts: array of {day: age, users: count}
        const cohorts = [];

        // Generate Prediction
        let date = new Date(start);
        window.lastForecastData = [];
        const tableBody = document.getElementById('forecast-table-body');
        if (tableBody) tableBody.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // Helper to get OS value safely
        const selects = document.querySelectorAll('select.input-premium');
        const osValue = selects[2] ? selects[2].value : 'All';

        // Track existing user DAU separately
        let existingUserDAU = currentDAU;

        for (let i = 0; i <= daysPrediction; i++) {
            const dateStr = date.toISOString().split('T')[0];
            labels.push(dateStr);

            // Add new cohort at the start of each day (except day 0)
            if (i > 0) {
                cohorts.push({ day: 0, users: dnu });
            }

            // Age existing cohorts and calculate retention
            // Two-segment model: R(t) = (D1/100) * t^(-b) for t >= 1
            // b anchored to D1 and D180
            let newUserDAU = 0;
            const b = calculateDecayExponent(dnuD1RR, dnuD30RR, dnuD180RR);

            cohorts.forEach(cohort => {
                cohort.day++;
                if (cohort.day >= 1 && dnuD1RR > 0 && dnuD180RR > 0) {
                    const retention = (dnuD1RR / 100) * Math.pow(cohort.day, -b);
                    newUserDAU += cohort.users * Math.max(0, Math.min(1, retention));
                }
            });

            // Calculate existing user DAU (apply daily retention)
            if (i > 0) {
                existingUserDAU = existingUserDAU * existingDailyRetention;
            }

            // Total DAU = existing users + new user cohorts
            const totalDAU = existingUserDAU + newUserDAU;
            predictionData.push(totalDAU);

            // Calculate Components
            const newUsers = i === 0 ? 0 : dnu;
            const stockDAU = existingUserDAU;

            // Calculate Growth
            let netGrowth = 0;
            let growthPercent = 0;
            if (i > 0) {
                const prevDAU = predictionData[i - 1];
                netGrowth = totalDAU - prevDAU;
                growthPercent = prevDAU > 0 ? (netGrowth / prevDAU) * 100 : 0;
            }

            // Store detailed data
            const rowData = {
                date: dateStr,
                os: osValue,
                total: totalDAU,
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
                <td>${Math.round(totalDAU).toLocaleString()}</td>
                <td class="${netGrowth >= 0 ? 'text-success' : 'text-danger'}">${netGrowth > 0 ? '+' : ''}${Math.round(netGrowth).toLocaleString()}</td>
                <td class="${growthPercent >= 0 ? 'text-success' : 'text-danger'}">${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(2)}%</td>
                <td>${Math.round(newUsers).toLocaleString()}</td>
            `;
            fragment.appendChild(tr);

            date.setDate(date.getDate() + 1);
        }

        if (tableBody) tableBody.appendChild(fragment);

        dauChart.data.labels = labels;
        dauChart.data.datasets[0].data = []; // History empty
        dauChart.data.datasets[1].data = predictionData;

        dauChart.update();

        // Update summary numbers
        const lastVal = predictionData[predictionData.length - 1];
        const firstVal = predictionData[0];
        const valueHighlight = document.querySelector('.value-highlight');
        if (valueHighlight) {
            valueHighlight.textContent = Math.round(lastVal).toLocaleString();
        }

        // Update Chart Header Summary
        document.querySelectorAll('.summary-item .value')[0].textContent =
            parseInt(dnu).toLocaleString();
        document.querySelectorAll('.summary-item .value')[1].textContent =
            Math.round(firstVal).toLocaleString();
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

// Toggle Add Row Mode - Show/Hide Delete Buttons
window.toggleAddRowMode = function(sectionId, buttonElement) {
    const tbody = document.getElementById(sectionId);
    if (!tbody) return;

    const isAddMode = buttonElement.textContent.trim() === '+ Add Row';
    
    if (isAddMode) {
        // Add a new row first
        addDnuRow(sectionId);
        
        // Show delete buttons and change to "Add Row Cancel"
        const deleteButtons = tbody.querySelectorAll('.btn-delete-row-circle');
        const deleteCells = tbody.querySelectorAll('.delete-cell');
        deleteButtons.forEach(btn => {
            btn.style.display = 'flex';
        });
        deleteCells.forEach(cell => {
            cell.style.width = '28px';
            cell.style.minWidth = '28px';
            cell.style.padding = '2px 4px';
        });
        buttonElement.textContent = '× Add Row Cancel';
        buttonElement.onclick = function() {
            toggleAddRowMode(sectionId, this);
        };
    } else {
        // Hide delete buttons and change back to "Add Row"
        const deleteButtons = tbody.querySelectorAll('.btn-delete-row-circle');
        const deleteCells = tbody.querySelectorAll('.delete-cell');
        deleteButtons.forEach(btn => {
            btn.style.display = 'none';
        });
        deleteCells.forEach(cell => {
            cell.style.width = '0';
            cell.style.minWidth = '0';
            cell.style.padding = '2px 0';
        });
        buttonElement.textContent = '+ Add Row';
        buttonElement.onclick = function() {
            toggleAddRowMode(sectionId, this);
        };
    }
};

// Add Row Function (Global Scope)
window.addDnuRow = function (sectionId) {
    const tbody = document.getElementById(sectionId);
    if (!tbody) return;

    const actionRow = tbody.querySelector('.action-row');
    const newRow = document.createElement('tr');

    // Determine read-only state based on section (Section 4 is organic, no budget/cpa)
    const isOrganic = sectionId === 'section-4-body';
    const bgStyle = 'style="background-color: #f1f5f9;"';

    newRow.innerHTML = `
        <td class="delete-cell">
            <button class="btn-delete-row-circle" onclick="deleteDnuRow(this)" title="Delete Row" style="display: flex;">−</button>
        </td>
        <td class="channel-name"><input type="text" class="input-plain" value="New Channel"></td>
        <td><input type="number" class="input-compact dnu-input" value="0"></td>
        <td><input type="number" class="input-compact budget-input" value="0" readonly ${bgStyle}></td>
        <td><input type="number" class="input-compact cpa-input" value="0" ${isOrganic ? 'disabled ' + bgStyle : ''}></td>
        <td><input type="number" class="input-compact" value="0"></td>
        <td><input type="number" class="input-compact" value="0"></td>
        <td><input type="number" class="input-compact" value="0" readonly ${bgStyle}></td>
        <td><input type="number" class="input-compact" value="0" readonly ${bgStyle}></td>
        <td><input type="number" class="input-compact" value="1.26"></td>
        <td><input type="number" class="input-compact" value="0" readonly ${bgStyle}></td>
    `;

    tbody.insertBefore(newRow, actionRow);
    
    // Show delete buttons when adding a row
    const deleteButtons = tbody.querySelectorAll('.btn-delete-row-circle');
    const deleteCells = tbody.querySelectorAll('.delete-cell');
    deleteButtons.forEach(btn => {
        btn.style.display = 'flex';
    });
    deleteCells.forEach(cell => {
        cell.style.width = '28px';
        cell.style.minWidth = '28px';
        cell.style.padding = '2px 4px';
    });
    
    // Update the Add Row button to Cancel
    const addRowButton = actionRow.querySelector('.add-row-cell');
    if (addRowButton) {
        addRowButton.textContent = '× Add Row Cancel';
        addRowButton.onclick = function() {
            toggleAddRowMode(sectionId, this);
        };
    }
};

// Delete Row Function (Global Scope)
window.deleteDnuRow = function(button) {
    if (!confirm('Are you sure you want to delete this row?')) {
        return;
    }
    
    const row = button.closest('tr');
    if (row && !row.classList.contains('dnu-section-header') && 
        !row.classList.contains('dnu-col-header') && 
        !row.classList.contains('action-row') && 
        !row.classList.contains('section-total-row') && 
        !row.classList.contains('grand-total-row')) {
        row.remove();
        // Update totals after deletion
        if (typeof updateDnuTotals === 'function') {
            updateDnuTotals();
        }
    }
};

// Add delete buttons to existing rows on page load
function addDeleteButtonsToExistingRows() {
    const sections = ['section-1-body', 'section-2-body', 'section-3-body', 'section-4-body'];
    
    sections.forEach(sectionId => {
        const tbody = document.getElementById(sectionId);
        if (!tbody) return;
        
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            // Skip header, action, and total rows
            if (row.classList.contains('dnu-section-header') || 
                row.classList.contains('dnu-col-header') || 
                row.classList.contains('action-row') || 
                row.classList.contains('section-total-row')) {
                return;
            }
            
            // Check if delete button already exists
            if (row.querySelector('.btn-delete-row-circle')) {
                return;
            }
            
            // Check if this row has data cells (not empty)
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                // Check if first cell is already a delete cell
                const firstCell = cells[0];
                if (firstCell && firstCell.classList.contains('delete-cell')) {
                    return; // Already has delete cell
                }
                
                // Add delete button cell at the beginning
                const deleteCell = document.createElement('td');
                deleteCell.className = 'delete-cell';
                deleteCell.style.width = '0';
                deleteCell.style.minWidth = '0';
                deleteCell.style.padding = '2px 0';
                deleteCell.innerHTML = '<button class="btn-delete-row-circle" onclick="deleteDnuRow(this)" title="Delete Row" style="display: none;">−</button>';
                row.insertBefore(deleteCell, firstCell);
            }
        });
    });
}

// Add delete buttons to existing rows - will be called after page loads
// This function is called from the main DOMContentLoaded handler

// Calculate LT using two-segment model:
// R(0) = 1.0, R(t) = (D1/100) * t^(-b) for t >= 1
// b anchored to D1 and D30: (D1/100) * 30^(-b) = D30/100
// => b = -log(D30/D1) / log(30)
function calculateLT(d1, d30, days) {
    if (d1 <= 0 || d30 <= 0) return 0;

    const r1 = d1 / 100;
    const r30 = d30 / 100;
    if (r30 >= r1) return 0;

    const b = -Math.log(r30 / r1) / Math.log(30);

    // Day 0: R(0) = 1.0, Day t >= 1: R(t) = r1 * t^(-b)
    let sum = 1.0;
    for (let t = 1; t < days; t++) {
        sum += r1 * Math.pow(t, -b);
    }

    return sum;
}

function updateDnuTotals() {
    const sections = ['section-1-body', 'section-2-body', 'section-3-body', 'section-4-body'];
    let grandDnu = 0;
    let grandBudget = 0;

    // Weighted Accumulators for Grand Total
    let grandWeightedRR = 0;
    let grandWeightedRR30 = 0;
    let grandWeightedLt30 = 0;
    let grandWeightedLt180 = 0;
    let grandWeightedArpu = 0;
    let grandTotalRevenue = 0;

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
        let weightedRR30 = 0;
        let weightedLt30 = 0;
        let weightedLt180 = 0;
        let weightedArpu = 0;
        let secTotalRevenue = 0;

        rows.forEach(row => {
            const inputs = row.querySelectorAll('input');
            // Indices: 0=Channel, 1=DNU, 2=Budget, 3=CPA, 4=RR(D1), 5=RR30(D30), 6=LT30, 7=LT180, 8=ARPU, 9=ROI
            // Note: First column is now delete button, so indices are shifted

            const dnu = parseFloat(inputs[1]?.value) || 0;
            let cpa = parseFloat(inputs[3]?.value) || 0;
            const rr = parseFloat(inputs[4]?.value) || 0;
            const rr30 = parseFloat(inputs[5]?.value) || 0;
            const arpu = parseFloat(inputs[8]?.value) || 0;
            const budgetInput = inputs[2];

            // 1. Calculate Budget = DNU * CPA based on input
            let budget = 0;
            const cpaDisabled = inputs[3]?.hasAttribute('disabled');

            if (cpaDisabled) {
                budget = parseFloat(budgetInput.value) || 0;
            } else {
                budget = dnu * cpa;
                budgetInput.value = Math.round(budget);
            }

            // 2. Calculate LT30, LT180
            const lt30 = calculateLT(rr, rr30, 30);
            const lt180 = calculateLT(rr, rr30, 180);

            if (inputs[6]) inputs[6].value = lt30.toFixed(2);
            if (inputs[7]) inputs[7].value = lt180.toFixed(2);

            // 3. Calculate ROI
            const revenuePerUser = lt180 * arpu;
            let roi = 0;
            if (cpa > 0) {
                roi = (revenuePerUser - cpa) / cpa;
            } else {
                roi = 0;
            }

            const roiInput = inputs[9];
            if (roiInput) {
                if (!cpaDisabled && cpa > 0) {
                    roiInput.value = roi.toFixed(2);
                } else if (cpaDisabled) {
                    roiInput.value = "";
                } else {
                    roiInput.value = "0.00";
                }
            }

            const totalRevenue = dnu * revenuePerUser;

            // Accumulate
            secDnu += dnu;
            secBudget += budget;
            weightedRR += rr * dnu;
            weightedRR30 += rr30 * dnu;
            weightedLt30 += lt30 * dnu;
            weightedLt180 += lt180 * dnu;
            weightedArpu += arpu * dnu;
            secTotalRevenue += totalRevenue;
        });

        // Calculate Section Averages
        const secCpa = secDnu > 0 ? (secBudget / secDnu) : 0;
        const secAvgRR = secDnu > 0 ? (weightedRR / secDnu) : 0;
        const secAvgRR30 = secDnu > 0 ? (weightedRR30 / secDnu) : 0;
        const secAvgLt30 = secDnu > 0 ? (weightedLt30 / secDnu) : 0;
        const secAvgLt180 = secDnu > 0 ? (weightedLt180 / secDnu) : 0;
        const secAvgArpu = secDnu > 0 ? (weightedArpu / secDnu) : 0;
        const secAvgRoi = secBudget > 0 ? ((secTotalRevenue - secBudget) / secBudget) : 0;

        // Update Section Total Row
        const totalRow = tbody.querySelector('.section-total-row');
        if (totalRow) {
            totalRow.querySelector('.total-dnu').textContent = Math.round(secDnu).toLocaleString();
            totalRow.querySelector('.total-budget').textContent = Math.round(secBudget).toLocaleString();
            totalRow.querySelector('.total-cpa').textContent = secCpa.toFixed(2);
            totalRow.querySelector('.total-rr').textContent = secAvgRR.toFixed(2);
            totalRow.querySelector('.total-rr30').textContent = secAvgRR30.toFixed(2);
            totalRow.querySelector('.total-lt30').textContent = secAvgLt30.toFixed(2);
            totalRow.querySelector('.total-lt180').textContent = secAvgLt180.toFixed(2);
            totalRow.querySelector('.total-arpu').textContent = secAvgArpu.toFixed(2);
            totalRow.querySelector('.total-roi').textContent = secAvgRoi.toFixed(2);
        }

        // Accumulate Grand Totals
        grandDnu += secDnu;
        grandBudget += secBudget;
        grandWeightedRR += weightedRR;
        grandWeightedRR30 += weightedRR30;
        grandWeightedLt30 += weightedLt30;
        grandWeightedLt180 += weightedLt180;
        grandWeightedArpu += weightedArpu;
        grandTotalRevenue += secTotalRevenue; // Sum revenue for Grand ROI
    });

    // Calculate Grand Total Averages
    const grandCpa = grandDnu > 0 ? (grandBudget / grandDnu) : 0;
    const grandAvgRR = grandDnu > 0 ? (grandWeightedRR / grandDnu) : 0;
    const grandAvgRR30 = grandDnu > 0 ? (grandWeightedRR30 / grandDnu) : 0;
    const grandAvgLt30 = grandDnu > 0 ? (grandWeightedLt30 / grandDnu) : 0;
    const grandAvgLt180 = grandDnu > 0 ? (grandWeightedLt180 / grandDnu) : 0;
    const grandAvgArpu = grandDnu > 0 ? (grandWeightedArpu / grandDnu) : 0;
    const grandAvgRoi = grandBudget > 0 ? ((grandTotalRevenue - grandBudget) / grandBudget) : 0;

    // Update Grand Total Footer
    document.getElementById('grand-total-dnu').textContent = Math.round(grandDnu).toLocaleString();
    document.getElementById('grand-total-budget').textContent = Math.round(grandBudget).toLocaleString();
    document.getElementById('grand-total-cpa').textContent = grandCpa.toFixed(2);
    document.getElementById('grand-total-rr').textContent = grandAvgRR.toFixed(2);
    document.getElementById('grand-total-rr30').textContent = grandAvgRR30.toFixed(2);
    document.getElementById('grand-total-lt30').textContent = grandAvgLt30.toFixed(2);
    document.getElementById('grand-total-lt180').textContent = grandAvgLt180.toFixed(2);
    document.getElementById('grand-total-arpu').textContent = grandAvgArpu.toFixed(2);
    document.getElementById('grand-total-roi').textContent = grandAvgRoi.toFixed(2);

    // --- Setup Save Button Handler based on User Request ---
    const saveBtn = document.getElementById('btn-save-dnu');
    if (saveBtn) {
        saveBtn.onclick = function () {
            // Update Forecast Settings with Grand Totals
            const dnuInput = document.getElementById('dnu');
            const lt30Input = document.getElementById('lt30');
            const lt180Input = document.getElementById('lt180');


            if (dnuInput) dnuInput.value = Math.round(grandDnu).toLocaleString();
            if (lt30Input) lt30Input.value = grandAvgLt30.toFixed(2);
            if (lt180Input) lt180Input.value = grandAvgLt180.toFixed(2);

            alert("DNU Totals saved to Forecast Settings! DNU: " + Math.round(grandDnu) + ", LT30: " + grandAvgLt30.toFixed(2) + ", LT180: " + grandAvgLt180.toFixed(2));
        };
    }
    
    // Add delete buttons to existing rows
    setTimeout(addDeleteButtonsToExistingRows, 100);
}
