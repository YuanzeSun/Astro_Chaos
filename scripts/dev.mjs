// npm run dev: the AI server (tsx watch) and Vite side by side; Ctrl+C stops both.
import { spawn } from "node:child_process";

const bin = (name) => new URL(`../node_modules/.bin/${name}`, import.meta.url).pathname;
const children = [
  spawn(bin("tsx"), ["watch", "--clear-screen=false", "server/index.ts"], { stdio: "inherit" }),
  spawn(bin("vite"), [], { stdio: "inherit" }),
];
const stop = () => children.forEach((c) => c.kill("SIGTERM"));
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const c of children) c.on("exit", (code) => {
  stop();
  process.exitCode = code ?? 0;
});
