let monthlyChartInstance = null;
let yearlyChartInstance = null;

function renderCharts(transactions) {
  renderMonthlyChart(transactions);
  renderYearlyChart(transactions);
}

function renderMonthlyChart(transactions) {
  const now = new Date();
  const year = parseInt(
    document.getElementById('chart-year')?.value || now.getFullYear()
  );
  const month = parseInt(
    document.getElementById('chart-month')?.value || now.getMonth() + 1
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
  const incomeData = Array(daysInMonth).fill(0);
  const expenseData = Array(daysInMonth).fill(0);

  transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (d.getFullYear() === year && d.getMonth() + 1 === month) {
      const day = d.getDate() - 1;
      if (tx.type === 'in') incomeData[day] += Number(tx.amount);
      else expenseData[day] += Number(tx.amount);
    }
  });

  const ctx = document.getElementById('monthly-chart').getContext('2d');
  if (monthlyChartInstance) monthlyChartInstance.destroy();

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 6,
          borderSkipped: false,
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(239, 68, 68, 0.85)',
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            callback: val =>
              val >= 1000000
                ? `${(val / 1000000).toFixed(1)}M`
                : val >= 1000
                ? `${(val / 1000).toFixed(0)}K`
                : val,
            font: { size: 11 },
          },
        },
      },
    },
  });
}

function renderYearlyChart(transactions) {
  const year = parseInt(
    document.getElementById('chart-year')?.value || new Date().getFullYear()
  );
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];

  const incomeData = Array(12).fill(0);
  const expenseData = Array(12).fill(0);

  transactions.forEach(tx => {
    const d = new Date(tx.date);
    if (d.getFullYear() === year) {
      const m = d.getMonth();
      if (tx.type === 'in') incomeData[m] += Number(tx.amount);
      else expenseData[m] += Number(tx.amount);
    }
  });

  const ctx = document.getElementById('yearly-chart').getContext('2d');
  if (yearlyChartInstance) yearlyChartInstance.destroy();

  yearlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Pemasukan',
          data: incomeData,
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.12)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 16 },
        },
        tooltip: {
          callbacks: {
            label: ctx =>
              `${ctx.dataset.label}: ${new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
              }).format(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: {
            callback: val =>
              val >= 1000000
                ? `${(val / 1000000).toFixed(1)}M`
                : val >= 1000
                ? `${(val / 1000).toFixed(0)}K`
                : val,
            font: { size: 11 },
          },
        },
      },
    },
  });
}
