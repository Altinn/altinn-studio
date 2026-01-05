# Process engine

This library provides runtime process engine capabilities for Altinn 3 applications, with optional database persistence for job and task tracking.

![Overview](docs/overview.drawio.svg)

![Sequence flow](docs/sequenceFlow.drawio.svg)

## Database Setup (Development)

The ProcessEngine supports optional database persistence using PostgreSQL and Entity Framework Core.

### Quick Start with Docker

1. **Start the database:**
   ```bash
   cd src/Altinn.App.ProcessEngine
   docker-compose up -d
   ```

2. **Create migrations (if required):**

   See [Creating New Migrations](#creating-new-migrations) below.

3. **Apply migrations:**
   ```bash
   dotnet ef database update
   ```

4. **Access pgAdmin:**
   - URL: http://localhost:5050
   - Database password: postgres123

### Configuration

```csharp
// Add ProcessEngine with database persistence
services.AddProcessEngine(true, "Host=localhost;Database=altinn_processengine;Username=postgres;Password=postgres123");

// Or add ProcessEngine without database (in-memory only)
services.AddProcessEngine();
```

### Database Schema

The ProcessEngine creates these tables:
- `process_engine_jobs` - Stores job information and metadata
- `process_engine_tasks` - Stores individual tasks within jobs

### Development Notes

- **Connection String:** Default setup uses `postgres/postgres123` on port 5432
- **Database Name:** `altinn_processengine`
- **Migrations Location:** `Data/Migrations/`
- **In-Memory Fallback:** ProcessEngine works without database - jobs are only kept in memory

### Creating New Migrations

After modifying the data models and/or database context, create new migrations with:

```bash
dotnet ef migrations add TheMigrationName --output-dir Data/Migrations
```

# Misc notes

## Performance testing

### Setup
#### The test jobs
Each job consists of two tasks that each simply wait for half a second, before returning a successful response.

#### Random delays
Each test scenario will will encounter the following delays, which serves to simulate database writes.
- Queue writes: 50-500ms
- Job updates: 50-500ms
- Task updates: 50-500ms

The concurrency limit for the engine is 10 threads and the queue size is variable as noted in the table below. Adding items beyond the queue limit will encounter additional wait times for the caller while the queue frees up slots. However, a very large queue limit seems to be detrimental to the efficiency of the system.

### Results
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
