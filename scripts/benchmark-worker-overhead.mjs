import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'packages/docs/src/app/data');
const jsonPath = path.join(outputDir, 'benchmark-results.json');
const markdownPath = path.join(rootDir, 'BENCHMARK.md');

const config = {
  generatedAt: new Date().toISOString(),
  environment: {
    runtime: `Node ${process.version}`,
    platform: `${process.platform} ${process.arch}`,
    cpu: 'local machine',
  },
  workload: {
    name: 'Mandelbrot-style CPU workload',
    iterations: 3,
    size: 520,
    maxIterations: 180,
  },
};

function computeWorkload(size, maxIterations) {
  let checksum = 0;
  const centerX = -0.5;
  const centerY = 0;
  const zoom = 0.62;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const x0 = (x - size / 2) / (size * zoom) + centerX;
      const y0 = (y - size / 2) / (size * zoom) + centerY;
      let xi = x0;
      let yi = y0;
      let iteration = 0;

      while (iteration < maxIterations && xi * xi + yi * yi <= 4) {
        const nextX = xi * xi - yi * yi + x0;
        yi = 2 * xi * yi + y0;
        xi = nextX;
        iteration += 1;
      }

      checksum = (checksum + iteration) % 1_000_000_007;
    }
  }

  return checksum;
}

async function measureMainThread() {
  const probe = startResponsivenessProbe();
  await wait(40);

  const start = performance.now();
  let checksum = 0;
  for (let i = 0; i < config.workload.iterations; i += 1) {
    checksum =
      (checksum + computeWorkload(config.workload.size, config.workload.maxIterations)) %
      1_000_000_007;
  }
  const durationMs = performance.now() - start;

  await wait(40);
  const responsiveness = probe.stop();

  return {
    durationMs,
    maxTimerGapMs: responsiveness.maxTimerGapMs,
    missedFramesAt60hz: responsiveness.missedFramesAt60hz,
    checksum,
  };
}

async function measureWorkerThread() {
  const workerCode = `
    const { parentPort, workerData } = require('node:worker_threads');

    function computeWorkload(size, maxIterations) {
      let checksum = 0;
      const centerX = -0.5;
      const centerY = 0;
      const zoom = 0.62;

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const x0 = (x - size / 2) / (size * zoom) + centerX;
          const y0 = (y - size / 2) / (size * zoom) + centerY;
          let xi = x0;
          let yi = y0;
          let iteration = 0;

          while (iteration < maxIterations && xi * xi + yi * yi <= 4) {
            const nextX = xi * xi - yi * yi + x0;
            yi = 2 * xi * yi + y0;
            xi = nextX;
            iteration += 1;
          }

          checksum = (checksum + iteration) % 1000000007;
        }
      }

      return checksum;
    }

    let checksum = 0;
    for (let i = 0; i < workerData.iterations; i += 1) {
      checksum = (checksum + computeWorkload(workerData.size, workerData.maxIterations)) % 1000000007;
    }

    parentPort.postMessage({ checksum });
  `;

  const probe = startResponsivenessProbe();
  await wait(40);

  const start = performance.now();
  const checksum = await new Promise((resolve, reject) => {
    const worker = new Worker(workerCode, {
      eval: true,
      workerData: config.workload,
    });
    worker.once('message', message => resolve(message.checksum));
    worker.once('error', reject);
    worker.once('exit', code => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
    });
  });
  const durationMs = performance.now() - start;

  await wait(40);
  const responsiveness = probe.stop();

  return {
    durationMs,
    maxTimerGapMs: responsiveness.maxTimerGapMs,
    missedFramesAt60hz: responsiveness.missedFramesAt60hz,
    checksum,
  };
}

function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function startResponsivenessProbe() {
  const frameBudgetMs = 16.67;
  const gaps = [];
  let lastTick = performance.now();

  const interval = setInterval(() => {
    const now = performance.now();
    gaps.push(now - lastTick);
    lastTick = now;
  }, frameBudgetMs);

  return {
    stop() {
      clearInterval(interval);
      const maxTimerGapMs = gaps.length === 0 ? 0 : Math.max(...gaps);
      return {
        maxTimerGapMs: roundMetric(maxTimerGapMs),
        missedFramesAt60hz: Math.max(0, Math.round(maxTimerGapMs / frameBudgetMs) - 1),
      };
    },
  };
}

function roundMetric(value) {
  return Number(value.toFixed(2));
}

function buildReport(mainThread, workerThread) {
  const blockingReduction =
    mainThread.maxTimerGapMs === 0
      ? 0
      : ((mainThread.maxTimerGapMs - workerThread.maxTimerGapMs) / mainThread.maxTimerGapMs) * 100;

  return {
    ...config,
    summary: {
      mainThreadDurationMs: roundMetric(mainThread.durationMs),
      workerDurationMs: roundMetric(workerThread.durationMs),
      mainThreadMaxTimerGapMs: mainThread.maxTimerGapMs,
      workerMaxTimerGapMs: workerThread.maxTimerGapMs,
      mainThreadMissedFramesAt60hz: mainThread.missedFramesAt60hz,
      workerMissedFramesAt60hz: workerThread.missedFramesAt60hz,
      blockingReductionPercent: roundMetric(Math.max(0, blockingReduction)),
      checksumMatched: mainThread.checksum === workerThread.checksum,
    },
    runs: {
      mainThread,
      workerThread,
    },
  };
}

function toMarkdown(report) {
  return `# useWebWorker Benchmark

Generated at: ${report.generatedAt}

Runtime: ${report.environment.runtime} on ${report.environment.platform}

Workload: ${report.workload.name}, ${report.workload.iterations} runs, size ${report.workload.size}, max iterations ${report.workload.maxIterations}.

| Scenario | Total time | Max timer gap | Missed 60Hz frames |
| --- | ---: | ---: |
| Main thread | ${report.summary.mainThreadDurationMs} ms | ${report.summary.mainThreadMaxTimerGapMs} ms | ${report.summary.mainThreadMissedFramesAt60hz} |
| Worker thread | ${report.summary.workerDurationMs} ms | ${report.summary.workerMaxTimerGapMs} ms | ${report.summary.workerMissedFramesAt60hz} |

Blocking reduction: ${report.summary.blockingReductionPercent}%

Checksum matched: ${report.summary.checksumMatched ? 'yes' : 'no'}
`;
}

const mainThread = await measureMainThread();
const workerThread = await measureWorkerThread();
const report = buildReport(mainThread, workerThread);

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(markdownPath, toMarkdown(report));

console.log(`Wrote ${path.relative(rootDir, jsonPath)}`);
console.log(`Wrote ${path.relative(rootDir, markdownPath)}`);
