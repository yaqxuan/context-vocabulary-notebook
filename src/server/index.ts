import { createProductionApp } from './startup.js';

const port = Number(process.env.PORT ?? 3107);
const app = createProductionApp();

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
