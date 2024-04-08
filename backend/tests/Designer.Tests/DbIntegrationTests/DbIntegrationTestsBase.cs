using Altinn.Studio.Designer.Repository.ORMImplementation.Data;
using Designer.Tests.Fixtures;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.DbIntegrationTests;

[Collection(nameof(PostgreSqlCollection))]
public abstract class DbIntegrationTestsBase
{
    protected PostgreSqlFixture DbFixture;
    protected DesignerdbContext DbContext;

    protected DbIntegrationTestsBase(PostgreSqlFixture dbFixture)
    {
        DbFixture = dbFixture;
        var options = CreatePostgresDbContextOptions();
        DbContext = new DesignerdbContext(options);
        DbContext.Database.ExecuteSql($"CREATE ROLE designer WITH LOGIN PASSWORD 'Test1234$'");
        DbContext.Database.Migrate();
    }

    private DbContextOptions<DesignerdbContext> CreatePostgresDbContextOptions()
    {
        return new DbContextOptionsBuilder<DesignerdbContext>()
            .UseNpgsql(DbFixture.ConnectionString)
            .Options;
    }
}
