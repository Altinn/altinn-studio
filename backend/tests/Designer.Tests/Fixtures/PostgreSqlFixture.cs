using System.Threading.Tasks;
using DotNet.Testcontainers.Images;
using Testcontainers.PostgreSql;
using Xunit;

namespace Designer.Tests.Fixtures;

public class PostgreSqlFixture : IAsyncLifetime
{
    private PostgreSqlContainer _postgreSqlContainer;
    public string ConnectionString => _postgreSqlContainer.GetConnectionString();

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
