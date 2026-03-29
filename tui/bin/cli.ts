#!/usr/bin/env node
import meow from "meow";
import { render } from "ink";
import React from "react";
import App from "../src/app.js";

const cli = meow(
  `
  Usage
    $ infrastructure-tui

  Options
    --jar <path>     Path to infrastructure-mcp JAR
    --config <path>  Config file path (default: ~/.infrastructure-mcp.json)
    --setup          Force re-run setup wizard
    --version        Show version
`,
  {
    importMeta: import.meta,
    flags: {
      jar: { type: "string" },
      config: { type: "string" },
      setup: { type: "boolean", default: false },
    },
  }
);

const initialScreen = cli.flags.setup ? "setup" : "dashboard";
render(React.createElement(App, { initialScreen }));
