using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.Repository.Tests.Fixtures;

namespace WorkflowEngine.Repository.Tests;

[Collection(PostgresCollection.Name)]
public sealed class DbRepositoryRegistrationTests(PostgresFixture fixture)
{
    [Fact]
    public async Task AddDbRepository_ContextFactory_ReusesDisposedContexts()
    {
        var services = new ServiceCollection();
        services.AddSingleton(new EngineConnectionString(fixture.ConnectionString));
        services.AddSingleton(Options.Create(fixture.Settings));
        services.AddDbRepository(enableAzureWorkloadIdentity: false);
        await using var provider = services.BuildServiceProvider();
        var factory = provider.GetRequiredService<IDbContextFactory<EngineDbContext>>();

        var first = factory.CreateDbContext();
        await first.DisposeAsync();
        await using var second = factory.CreateDbContext();

        Assert.Same(first, second);
    }
}
