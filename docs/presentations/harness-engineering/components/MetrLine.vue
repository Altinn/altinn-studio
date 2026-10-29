<!--
METR's 50% time horizons (METR-Horizon-v1.1, https://metr.org/time-horizons/): the length of task, in human working
time, that a model finishes half the time. One model for each column of the maturity slide. METR publishes no horizon
for Claude Opus 5.5, and its tasks can't measure beyond about 16 hours, which Claude Mythos Preview reached in April
2026. So the last point sits at that ceiling, drawn as a lower bound rather than a measurement.
-->
<script setup lang="ts">
const points = [
  { label: '4 min', model: 'GPT-4', date: 'Mar 2023', minutes: 3.99, measured: true },
  { label: '1 h', model: 'Claude 3.7 Sonnet', date: 'Feb 2025', minutes: 60.4, measured: true },
  { label: '5 h', model: 'Claude Opus 4.5', date: 'Nov 2025', minutes: 293, measured: true },
  { label: '16 h+', model: 'Claude Opus 5.5', date: '2026', minutes: 960, measured: false },
]
const width = 800
const top = 18
const bottom = 84
const lowest = Math.log10(3)
const highest = Math.log10(960)
const x = (index: number) => (width / points.length) * (index + 0.5)
const y = (minutes: number) => bottom - ((Math.log10(minutes) - lowest) / (highest - lowest)) * (bottom - top)
const segment = (from: number) => `M${x(from)},${y(points[from].minutes)} L${x(from + 1)},${y(points[from + 1].minutes)}`
</script>

<template>
  <svg :viewBox="`0 0 ${width} 112`" width="100%" role="img" aria-label="METR time horizons rising from 4 minutes to beyond 16 hours" style="font-family: Inter, sans-serif">
    <defs>
      <linearGradient id="metr-line" gradientUnits="userSpaceOnUse" x1="0" x2="800" y1="0" y2="0">
        <stop offset="0" stop-color="#2e4560" />
        <stop offset="0.5" stop-color="#1e98f5" />
        <stop offset="1" stop-color="#3fb27f" />
      </linearGradient>
    </defs>
    <path v-for="index in points.length - 1" :key="index" :d="segment(index - 1)" fill="none" stroke="url(#metr-line)" stroke-width="3" stroke-linecap="round" :stroke-dasharray="points[index].measured ? undefined : '7 6'" />
    <g v-for="(point, index) in points" :key="point.model">
      <title>{{ point.model }}, {{ point.date }}: {{ point.measured ? point.label : 'no published time horizon, beyond what METR measures' }}</title>
      <circle :cx="x(index)" :cy="y(point.minutes)" r="6" fill="#0f1823" :stroke="point.measured ? '#e8eef5' : '#3fb27f'" stroke-width="2" :stroke-dasharray="point.measured ? undefined : '3 2'" />
      <text :x="x(index) + 12" :y="y(point.minutes) + 5" :fill="point.measured ? '#e8eef5' : '#3fb27f'" style="font-size: 15px; font-weight: 650">{{ point.label }}</text>
      <text :x="x(index)" y="104" text-anchor="middle" fill="#93a4b8" style="font-size: 11px">{{ point.model }} · {{ point.date }}</text>
    </g>
  </svg>
</template>
