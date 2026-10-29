<!-- A global-top layer, since the slides' opaque background covers anything in global-bottom. -->
<script setup lang="ts">
import { computed } from 'vue'
import { useNav } from '@slidev/client'
const { currentPage, total, currentLayout } = useNav()
const progress = computed(() => `${(currentPage.value / total.value) * 100}%`)
</script>

<template>
  <template v-if="currentLayout !== 'cover' && currentLayout !== 'end'">
    <footer
      class="absolute bottom-0 left-0 right-0 px-10 py-3 flex items-center justify-between text-xs"
      style="color: var(--dd-muted)"
    >
      <span class="flex items-center gap-2">
        <span class="accent-bar" style="width: 36px; height: 3px"><span /><span /><span /><span /></span>
        Harness engineering · Altinn Studio
      </span>
      <span>{{ currentPage }} / {{ total }}</span>
    </footer>
    <div class="absolute bottom-0 left-0 right-0 h-[3px]" style="background: var(--dd-surface-2)">
      <div
        class="h-full"
        :style="{ width: progress, background: 'linear-gradient(90deg, var(--dd-blue), var(--dd-sky), var(--dd-green))', transition: 'width 0.4s ease' }"
      />
    </div>
  </template>
</template>
