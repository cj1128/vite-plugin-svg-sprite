<template lang="pug">
svg.svg-icon
  use(:xlink:href="id")
</template>

<script>
export default {
  props: {
    id: {
      type: String,
      required: true,
    },
  },
}
</script>

<style lang="stylus" scoped>
.svg-icon
  fill: currentColor
  width: 1em
  height: 1em
  font-size: 40px
</style>