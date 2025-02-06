const canvas = document.getElementById("graph");
const ctx = canvas.getContext("2d");

const nodeCountInput = document.getElementById("nodeCount");
const densityInput = document.getElementById("density");
const kColorsInput = document.getElementById("kColors");
const speedInput = document.getElementById("speed");
const randomizeBtn = document.getElementById("randomize");
const solveBtn = document.getElementById("solve");
const stopBtn = document.getElementById("stop");
const clearBtn = document.getElementById("clear");
const statusEl = document.getElementById("status");
const metricsEl = document.getElementById("metrics");

const palette = ["#7ec8ff", "#ff9ac1", "#ffd372", "#8cf6cb", "#d2a4ff", "#ffb67a"];

let nodes = [];
let edges = [];
let adjacency = [];
let colors = [];
let nodeOrder = [];

let solving = false;
let shouldStop = false;
let steps = 0;
let backtracks = 0;
let checks = 0;

function delayMs() {
  return Math.max(0, 70 - Number(speedInput.value) * 0.65);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateGraph() {
  const n = Number(nodeCountInput.value);
  const prob = Number(densityInput.value) / 100;

  nodes = [];
  edges = [];
  adjacency = Array.from({ length: n }, () => []);
  colors = Array(n).fill(0);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.34;

  for (let i = 0; i < n; i += 1) {
    const angle = (i / n) * Math.PI * 2;
    const jitter = 20;
    nodes.push({
      x: cx + Math.cos(angle) * radius + (Math.random() * 2 - 1) * jitter,
      y: cy + Math.sin(angle) * radius + (Math.random() * 2 - 1) * jitter,
      id: i,
    });
  }

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (Math.random() < prob) {
        edges.push([i, j]);
        adjacency[i].push(j);
        adjacency[j].push(i);
      }
    }
  }

  // Degree ordering usually reduces backtracking depth.
  nodeOrder = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => adjacency[b].length - adjacency[a].length
  );

  steps = 0;
  backtracks = 0;
  checks = 0;
  solving = false;
  shouldStop = false;

  statusEl.textContent = "Graph generated";
  render();
}

function clearColors() {
  colors.fill(0);
  steps = 0;
  backtracks = 0;
  checks = 0;
  statusEl.textContent = "Colors cleared";
  render();
}

function safeColor(node, c) {
  checks += 1;
  for (const nb of adjacency[node]) {
    if (colors[nb] === c) return false;
  }
  return true;
}

async function solveFrom(index) {
  if (shouldStop) return false;
  if (index >= nodeOrder.length) return true;

  const node = nodeOrder[index];
  const k = Number(kColorsInput.value);

  for (let c = 1; c <= k; c += 1) {
    colors[node] = c;
    steps += 1;

    render(node);
    await sleep(delayMs());

    if (safeColor(node, c)) {
      const done = await solveFrom(index + 1);
      if (done) return true;
      if (shouldStop) return false;
    }
  }

  colors[node] = 0;
  backtracks += 1;
  render(node);
  await sleep(delayMs() * 0.7);
  return false;
}

async function solveGraph() {
  if (solving) return;
  solving = true;
  shouldStop = false;

  steps = 0;
  backtracks = 0;
  checks = 0;
  colors.fill(0);

  statusEl.textContent = "Solving...";
  render();

  const ok = await solveFrom(0);

  if (shouldStop) {
    statusEl.textContent = "Stopped";
  } else {
    statusEl.textContent = ok ? "Solved" : "No solution for current K";
  }

  solving = false;
  render();
}

function drawEdge(a, b, conflict) {
  const na = nodes[a];
  const nb = nodes[b];

  ctx.strokeStyle = conflict ? "rgba(255,90,120,0.9)" : "rgba(150,190,245,0.38)";
  ctx.lineWidth = conflict ? 3 : 2;
  ctx.beginPath();
  ctx.moveTo(na.x, na.y);
  ctx.lineTo(nb.x, nb.y);
  ctx.stroke();
}

function drawNode(node, idx, activeNode) {
  const c = colors[idx];
  const fill = c === 0 ? "#1b2f4f" : palette[(c - 1) % palette.length];
  const active = idx === activeNode;

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(node.x, node.y, active ? 18 : 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = active ? "#fff3" : "#d8e8ff66";
  ctx.lineWidth = active ? 3 : 2;
  ctx.stroke();

  ctx.fillStyle = "#071322";
  ctx.font = "bold 12px Sora, sans-serif";
  ctx.fillText(String(idx), node.x - 4, node.y + 4);
}

function render(activeNode = -1) {
  ctx.fillStyle = "#040b16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const [a, b] of edges) {
    const conflict = colors[a] !== 0 && colors[a] === colors[b];
    drawEdge(a, b, conflict);
  }

  nodes.forEach((node, i) => drawNode(node, i, activeNode));

  const conflicts = edges.reduce((sum, [a, b]) => sum + (colors[a] !== 0 && colors[a] === colors[b] ? 1 : 0), 0);

  metricsEl.innerHTML = [
    `Nodes: ${nodes.length}`,
    `Edges: ${edges.length}`,
    `K: ${Number(kColorsInput.value)}`,
    `Steps: ${steps}`,
    `Constraint Checks: ${checks}`,
    `Backtracks: ${backtracks}`,
    `Conflicts: ${conflicts}`,
  ]
    .map((m) => `<span class="pill">${m}</span>`)
    .join("");
}

randomizeBtn.addEventListener("click", generateGraph);
clearBtn.addEventListener("click", clearColors);
solveBtn.addEventListener("click", solveGraph);
stopBtn.addEventListener("click", () => {
  shouldStop = true;
});

[nodeCountInput, densityInput].forEach((el) => {
  el.addEventListener("change", generateGraph);
});

kColorsInput.addEventListener("input", render);

generateGraph();
