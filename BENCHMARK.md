# useWebWorker Benchmark

Generated at: 2026-06-29T21:58:31.457Z

Runtime: Node v22.22.0 on darwin arm64

Workload: Mandelbrot-style CPU workload, 3 runs, size 520, max iterations 180.

| Scenario      | Total time | Max timer gap | Missed 60Hz frames |
| ------------- | ---------: | ------------: | ------------------ |
| Main thread   |  188.22 ms |     193.99 ms | 11                 |
| Worker thread |  195.94 ms |      17.31 ms | 0                  |

Blocking reduction: 91.08%

Checksum matched: yes
