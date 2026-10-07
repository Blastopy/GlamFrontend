<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'

const props = defineProps({
  labels: { type: Array, required: true },
  series: { type: Object, required: true },
})

const statusColors = {
  successful: '#7C9473',
  failed: '#B54B2C',
  pending: '#E8A33D',
}

function formatLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

const chartData = computed(() => ({
  labels: props.labels.map(formatLabel),
  datasets: Object.entries(props.series).map(([status, values]) => ({
    label: status,
    data: values,
    backgroundColor: statusColors[status] || '#9DB295',
    borderRadius: 3,
  })),
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, padding: 12 } } },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(22,36,29,0.06)' }, ticks: { precision: 0 } },
  },
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
