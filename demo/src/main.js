import { createApp } from "vue"
import App from "./App.vue"
import "virtual:svg-sprite"
import names from "virtual:svg-sprite/names"

console.log("All icons", names)

const app = createApp(App)
app.mount("#app")
