using System;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using DotNet.Testcontainers.Images;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;

namespace Designer.Tests.Fixtures;

public class TestDbProvider
{
    private static readonly Lazy<TestDbProvider> s_instance = new(() => new TestDbProvider(), LazyThreadSafetyMode.ExecutionAndPublication);
    public static TestDbProvider Instance => s_instance.Value;

    private PostgreSqlContainer _postgreSqlContainer;
    public PostgreSqlContainer PostgreSqlContainer => _postgreSqlContainer ?? throw new InvalidOperationException("You need to create a Postgres container first");

    private DesignerdbContext _dbContext;
    public DesignerdbContext DbContext => _dbContext ?? throw new InvalidOperationException("You need to start and migrate the database first");

    private TestDbProvider()
    {

    }

    public PostgreSqlContainer CreatePostgresContainer(DotNet.Testcontainers.Networks.INetwork network = null, string networkAlias = "db")
    {
        var containerBuilder = new PostgreSqlBuilder();
        if (network != null)
        {
            containerBuilder = containerBuilder.WithNetwork(network)
                .WithNetworkAliases(networkAlias);
        }

        _postgreSqlContainer = containerBuilder
            .WithImagePullPolicy(PullPolicy.Missing)
            .WithUsername(TestDbConstants.AdminUser)
            .WithPassword(TestDbConstants.AdminPassword)
            .WithDatabase(TestDbConstants.Database)
            .WithExposedPort(TestUrlsProvider.GetRandomAvailablePort())
            .Build();
        return _postgreSqlContainer;
    }

    public async Task MigrateAsync()
    {
        _dbContext = new DesignerdbContext(CreatePostgresDbContextOptions());
        await _dbContext.Database.ExecuteSqlRawAsync($"CREATE ROLE {TestDbConstants.NonAdminUser} WITH LOGIN PASSWORD '{TestDbConstants.NonAdminPassword}'");
        await _dbContext.Database.MigrateAsync();
    }

    private DbContextOptions<DesignerdbContext> CreatePostgresDbContextOptions() =>
        new DbContextOptionsBuilder<DesignerdbContext>()
            .UseNpgsql(PostgreSqlContainer.GetConnectionString())
            .Options;
}
