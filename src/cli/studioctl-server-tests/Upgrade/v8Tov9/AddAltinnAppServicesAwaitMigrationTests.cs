using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AddAltinnAppServicesAwaitMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private const string TemplateProgram = """
        using Altinn.App.Api.Extensions;
        using Microsoft.AspNetCore.Builder;
        using Microsoft.Extensions.Configuration;
        using Microsoft.Extensions.DependencyInjection;

        void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
        {
            // Register your apps custom service implementations here.
        }

        WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

        ConfigureServices(builder.Services, builder.Configuration);

        WebApplication app = builder.Build();

        app.Run();

        void ConfigureServices(IServiceCollection services, IConfiguration config)
        {
            services.AddAltinnAppControllersWithViews();

            // Register custom implementations for this application
            RegisterCustomAppServices(services, config);

            // Register services required to run this as an Altinn application
            services.AddAltinnAppServices(config, builder.Environment);
        }
        """;

    private (string Source, MigrationResult Result) Migrate(string source)
    {
        _app.Write("Program.cs", source);
        var result = new AddAltinnAppServicesAwaitMigration(Scanner()).Migrate();
        return (_app.Read("Program.cs"), result);
    }

    [Fact]
    public void Awaits_the_call_and_makes_the_template_function_async()
    {
        var (migrated, result) = Migrate(TemplateProgram);

        Assert.Contains("    await services.AddAltinnAppServices(config, builder.Environment);", migrated);
        Assert.Contains("async Task ConfigureServices(IServiceCollection services, IConfiguration config)", migrated);
        Assert.Contains("await ConfigureServices(builder.Services, builder.Configuration);", migrated);
        Assert.Contains("using System.Threading.Tasks;", migrated);
        Assert.DoesNotContain("void ConfigureServices", migrated);
        // The untouched local function keeps its shape
        Assert.Contains("void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)", migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("Program.cs:", StringComparison.Ordinal));
    }

    [Fact]
    public void Is_idempotent()
    {
        var (once, _) = Migrate(TemplateProgram);
        var (twice, result) = Migrate(once);

        Assert.Equal(once, twice);
        Assert.Empty(result.Messages);
    }

    [Fact]
    public void Awaits_a_call_in_the_top_level_statements()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Api.Extensions;
            using Microsoft.AspNetCore.Builder;

            var builder = WebApplication.CreateBuilder(args);
            builder.Services.AddAltinnAppServices(builder.Configuration, builder.Environment);
            builder.Build().Run();
            """
        );

        Assert.Contains(
            "await builder.Services.AddAltinnAppServices(builder.Configuration, builder.Environment);",
            migrated
        );
        Assert.DoesNotContain("using System.Threading.Tasks;", migrated);
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public void Keeps_an_already_async_function_and_its_using()
    {
        var (migrated, result) = Migrate(
            """
            using System.Threading.Tasks;
            using Altinn.App.Api.Extensions;
            using Microsoft.AspNetCore.Builder;
            using Microsoft.Extensions.Configuration;
            using Microsoft.Extensions.DependencyInjection;

            var builder = WebApplication.CreateBuilder(args);
            await ConfigureServices(builder.Services, builder.Configuration);

            async Task ConfigureServices(IServiceCollection services, IConfiguration config)
            {
                await SomethingElse();
                services.AddAltinnAppServices(config, builder.Environment);
            }
            """
        );

        Assert.Contains("    await services.AddAltinnAppServices(config, builder.Environment);", migrated);
        Assert.Equal(1, CountOf(migrated, "using System.Threading.Tasks;"));
        Assert.Equal(1, CountOf(migrated, "async Task ConfigureServices"));
        Assert.Equal(1, CountOf(migrated, "await ConfigureServices"));
        Assert.False(result.RequiresManualFollowUp);
    }

    [Fact]
    public void Reports_a_call_in_a_function_that_returns_a_value()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Api.Extensions;
            using Microsoft.Extensions.Configuration;
            using Microsoft.Extensions.DependencyInjection;

            IServiceCollection Configure(IServiceCollection services, IConfiguration config, IWebHostEnvironment env)
            {
                services.AddAltinnAppServices(config, env);
                return services;
            }
            """
        );

        Assert.DoesNotContain("await", migrated);
        Assert.True(result.RequiresManualFollowUp);
        Assert.Contains(result.Todos, t => t.Contains("could not be rewritten", StringComparison.Ordinal));
        Assert.Contains(result.Warnings, w => w.Contains("returns IServiceCollection", StringComparison.Ordinal));
    }

    [Fact]
    public void Reports_a_call_inside_a_lambda()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Api.Extensions;

            Host.CreateDefaultBuilder(args)
                .ConfigureServices((context, services) => services.AddAltinnAppServices(context.Configuration, env))
                .Build()
                .Run();
            """
        );

        Assert.DoesNotContain("await", migrated);
        Assert.True(result.RequiresManualFollowUp);
    }

    private static int CountOf(string text, string value) => text.Split(value).Length - 1;
}
