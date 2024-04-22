using System.Threading.Tasks;
using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using DotNet.Testcontainers.Images;
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Xunit;

namespace Designer.Tests.Fixtures;

public class DesignerDbFixture : IAsyncLifetime
{
    private PostgreSqlContainer _postgreSqlContainer;

    public string ConnectionString => _postgreSqlContainer.GetConnectionString();

    public DesignerdbContext DbContext;
    public async Task InitializeAsync()
    {
        _postgreSqlContainer = new PostgreSqlBuilder()
            .WithImagePullPolicy(PullPolicy.Missing)
            .WithUsername("designer_admin")
            .WithPassword("Test1234$")
            .WithDatabase("designer")
            .WithPortBinding(5432, true)
            .Build();
        await _postgreSqlContainer.StartAsync();

        var options = CreatePostgresDbContextOptions();
        DbContext = new DesignerdbContext(options);
        // Migration scripts except deisgner role to exist.
        await DbContext.Database.ExecuteSqlAsync($"CREATE ROLE designer WITH LOGIN PASSWORD 'Test1234$'");
        await DbContext.Database.MigrateAsync();
    }

    private DbContextOptions<DesignerdbContext> CreatePostgresDbContextOptions()
    {
        return new DbContextOptionsBuilder<DesignerdbContext>()
            .UseNpgsql(ConnectionString)
            .Options;
    }

    public async Task DisposeAsync()
    {
        await Task.CompletedTask;
        if (_postgreSqlContainer is null)
        {
            return;
        }

        await _postgreSqlContainer.DisposeAsync();
    }
}
