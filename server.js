require("dotenv").config();

const { createApp } = require("./src/app");

const PORT = Number(process.env.PORT || 5000);
const app = createApp({ enableBackgroundJobs: true });

app.listen(PORT, () => {
  console.log(`Server chay tai http://localhost:${PORT}`);
});
