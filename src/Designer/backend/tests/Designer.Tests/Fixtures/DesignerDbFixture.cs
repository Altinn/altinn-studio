#nullable disable
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
        _postgreSqlContainer = TestDbProvider.Instance.CreatePostgresContainer();
        await _postgreSqlContainer.StartAsync();
        await TestDbProvider.Instance.MigrateAsync();
        DbContext = TestDbProvider.Instance.DbContext;
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
