<script setup lang="ts"></script>

<template>
  <div
    data-header
    class="p-3 pr-6 flex justify-between items-center"
  >
    <RouterLink to="/basic">
      <div class="w-[var(--sidebar-width)] pl-4 font-semibold text-sm">
        Aadrila
      </div>
    </RouterLink>
    <div class="flex items-center gap-6">
      <HeaderColorMode />
    </div>
  </div>
</template>
