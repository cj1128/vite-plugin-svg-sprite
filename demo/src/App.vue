<template lang="pug">
.app
  h1 Vite Plugin SVG Sprite Demo

  .icons
    .icon
      svg-icon(id="#icons1--warning")
    .icon
      svg-icon(id="#icons1-d1-arrows-expand")
    .icon
      svg-icon(id="#icons1-d1.d2-chip")

    .icon
      svg-icon(id="#icons2--at-symbol")
    .icon
      svg-icon(id="#icons2-d1-clock")
    .icon
      svg-icon(id="#icons2-d1-d2-chat")

    .icon
      svg-icon(id="#icons3-film")
    .icon
      svg-icon(id="#icons3-heart")
    .icon
      svg-icon(id="#icons3-link")
</template>

<script>
import SvgIcon from "./SvgIcon.vue"

export default {
  components: {
    SvgIcon,
  },
}
</script>

<style lang="stylus" scoped>
.app
  font-family: PingFang SC
  width: 800px
  margin: auto
  color: #4e916a

.icons
  display: grid
  grid-template-columns: repeat(3, 200px)
  grid-auto-rows: 200px
  column-gap: 5px
  row-gap: 5px

.icon
  display: flex
  align-items: center
  justify-content: space-around
  border: dashed 1px #aaa
</style>