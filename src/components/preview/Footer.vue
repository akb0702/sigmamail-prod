<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <div
    data-footer
    class="text-xs text-muted-foreground text-right space-y-1"
  >
    <div>©{{ year }} • Aadrila</div>
  </div>
</template>
