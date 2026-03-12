using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;

namespace WorkflowEngine.Data.Repository;

internal sealed partial class EngineRepository(
    NpgsqlDataSource dataSource,
    IDbContextFactory<EngineDbContext> dbContextFactory,
    IOptions<EngineSettings> settings,
    IConcurrencyLimiter limiter,
    SqlBulkInserter sqlBulkInserter,
    TimeProvider timeProvider,
    ILogger<EngineRepository> logger
) : IEngineRepository;
