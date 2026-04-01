#!/usr/bin/env node
// packages/orchestrator/bin/cli.ts

import { main } from "../src/cli.js";

main(process.argv.slice(2)).catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
