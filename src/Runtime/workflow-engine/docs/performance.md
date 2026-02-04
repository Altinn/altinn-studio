# Performance testing

> [!NOTE]
> This data is quite outdated at this point. Should be run again or replaced with a more structured performance testing setup.

## Setup
### The test jobs
Each job consists of two tasks that each simply wait for half a second, before returning a successful response.

### Random delays
Each test scenario will will encounter the following delays, which serves to simulate database writes.
- Queue writes: 50-500ms
- Job updates: 50-500ms
- Task updates: 50-500ms

The concurrency limit for the engine is 10 threads and the queue size is variable as noted in the table below. Adding items beyond the queue limit will encounter additional wait times for the caller while the queue frees up slots. However, a very large queue limit seems to be detrimental to the efficiency of the system.

## Results
| Jobs | Queue size | Processing time |
|------|------------|-----------------|
| 1    | 10k        | 2.3s            |
| 10   | 10k        | 3.2s            |
| 100  | 10k        | 3.2s            |
| 1k   | 10k        | 3.5s            |
| 10k  | 10k        | 5.8s            |
| 100k | 1k         | 4m 19s          |
| 100k | 10k        | 29.8s           |
| 100k | 100k       | 45.5s           |
| 1m   | 10k        | 4m 44s          |
| 1m   | 100k       | 10m 8s          |
| 1m   | 1m         | 19m 40s         |
