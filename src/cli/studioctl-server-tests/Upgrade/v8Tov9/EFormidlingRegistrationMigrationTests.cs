using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class EFormidlingRegistrationMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private string Migrate(string source)
    {
        var path = _app.Write("Program.cs", source);
        new EFormidlingRegistrationMigration(Scanner()).Migrate();
        return File.ReadAllText(path);
    }

    [Fact]
    public void RewritesTheSingleGenericOverload()
    {
        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices<EFormidlingMetadata>(config);
            }
            """
        );

        Assert.Contains("services.AddEFormidling().WithMetadata<EFormidlingMetadata>();", migrated);
        Assert.DoesNotContain("AddEFormidlingServices", migrated, StringComparison.Ordinal);
    }

    [Fact]
    public void RewritesTheTwoGenericOverload_KeepingCustomReceivers()
    {
        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices<Meta, MyReceivers>(config);
            }
            """
        );

        Assert.Contains("services.AddEFormidling().WithMetadata<Meta>().WithReceivers<MyReceivers>();", migrated);
    }

    [Fact]
    public void DropsWithReceivers_WhenTheAppNamedTheDefault()
    {
        // AddEFormidling() registers DefaultEFormidlingReceivers itself, so carrying it over would only
        // restate the default - and leave the app importing a type it no longer needs.
        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices2<Meta, DefaultEFormidlingReceivers>(config);
            }
            """
        );

        Assert.Contains("services.AddEFormidling().WithMetadata<Meta>();", migrated);
        Assert.DoesNotContain("WithReceivers", migrated, StringComparison.Ordinal);
    }

    [Fact]
    public void KeepsWithReceivers_WhenTheAppDeclaresItsOwnTypeOfThatName()
    {
        // The type argument is matched on its right-most identifier, so an app that happens to name its
        // own receivers DefaultEFormidlingReceivers would otherwise have the registration dropped and
        // silently fall back to the library's implementation.
        _app.Write(
            "logic/DefaultEFormidlingReceivers.cs",
            """
            public class DefaultEFormidlingReceivers : IEFormidlingReceivers
            {
            }
            """
        );

        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices2<Meta, DefaultEFormidlingReceivers>(config);
            }
            """
        );

        Assert.Contains(
            "services.AddEFormidling().WithMetadata<Meta>().WithReceivers<DefaultEFormidlingReceivers>();",
            migrated
        );
    }

    [Fact]
    public void ReportsTheDroppedDefaultReceiversArgument()
    {
        _app.Write(
            "Program.cs",
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices2<Meta, DefaultEFormidlingReceivers>(config);
            }
            """
        );

        var result = new EFormidlingRegistrationMigration(Scanner()).Migrate();

        Assert.Empty(result.Todos);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("dropped the 'DefaultEFormidlingReceivers' type argument", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void RewritesTheV9SuffixedName()
    {
        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices2<Meta, MyReceivers>(config);
            }
            """
        );

        Assert.Contains("services.AddEFormidling().WithMetadata<Meta>().WithReceivers<MyReceivers>();", migrated);
    }

    [Fact]
    public void PreservesQualifiedTypeArgumentsAndTheReceivingExpression()
    {
        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                builder.Services.AddEFormidlingServices<App.Logic.Meta, App.Logic.Receivers>(config);
            }
            """
        );

        Assert.Contains(
            "builder.Services.AddEFormidling().WithMetadata<App.Logic.Meta>().WithReceivers<App.Logic.Receivers>();",
            migrated
        );
    }

    [Fact]
    public void CollapsesAMultiLineReceiverOntoOneLine()
    {
        // The receiver is re-emitted without its interior formatting: the alternative is threading the
        // original line breaks through a call chain of a different shape, and the app is free to
        // re-format afterwards. What must not happen is a broken or duplicated expression.
        var migrated = Migrate(
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                builder
                    .Services
                    .AddEFormidlingServices<Meta>(config);
            }
            """
        );

        Assert.Contains("builder.Services.AddEFormidling().WithMetadata<Meta>();", migrated);
        Assert.DoesNotContain("AddEFormidlingServices", migrated, StringComparison.Ordinal);
    }

    [Fact]
    public void IsIdempotent()
    {
        const string AlreadyMigrated = """
            void RegisterCustomAppServices(IServiceCollection services)
            {
                services.AddEFormidling().WithMetadata<Meta>();
            }
            """;

        Assert.Equal(AlreadyMigrated, Migrate(AlreadyMigrated));
    }

    [Fact]
    public void LeavesUnrelatedCallsAlone()
    {
        const string Unrelated = """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddTransient<IServiceTask, MyTask>();
            }
            """;

        Assert.Equal(Unrelated, Migrate(Unrelated));
    }

    [Fact]
    public void ReportsAStaticCallInsteadOfGuessingAtIt()
    {
        _app.Write(
            "Program.cs",
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                ServiceCollectionExtensions.AddEFormidlingServices2<Meta, MyReceivers>(services, config);
            }
            """
        );

        var result = new EFormidlingRegistrationMigration(Scanner()).Migrate();

        Assert.Contains(
            result.Todos,
            t => t.Contains("call shape this upgrade does not rewrite", StringComparison.Ordinal)
        );
        // Crucially, it must not have treated the containing type as the service collection.
        Assert.DoesNotContain(
            "ServiceCollectionExtensions.AddEFormidling()",
            File.ReadAllText(Path.Combine(_app.Root, "App", "Program.cs")),
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void FlagsADroppedArgumentThatWasNotAPlainVariable()
    {
        _app.Write(
            "Program.cs",
            """
            void RegisterCustomAppServices(IServiceCollection services, IConfiguration config)
            {
                services.AddEFormidlingServices<Meta>(new ConfigurationBuilder().Build());
            }
            """
        );

        var result = new EFormidlingRegistrationMigration(Scanner()).Migrate();

        // Still rewritten - it has to be, or the app will not compile - but the developer is told the
        // settings source may not have carried over.
        Assert.Empty(result.Todos);
        Assert.Contains(result.Warnings, w => w.Contains("not a plain configuration", StringComparison.Ordinal));
    }
}
