<script setup lang="ts"></script>

<template>
  <div
    data-header
    class="p-3 pr-6 flex justify-between items-center"
  >
    <RouterLink to="/basic">
      <div class="pl-3 flex items-center">
        <img
          src="/logo.svg"
          alt="Sigmamail"
          class="h-7 text-foreground dark:invert"
        >
      </div>
    </RouterLink>
    <div class="flex items-center gap-6">
      <HeaderColorMode />
    </div>
  </div>
</template>
