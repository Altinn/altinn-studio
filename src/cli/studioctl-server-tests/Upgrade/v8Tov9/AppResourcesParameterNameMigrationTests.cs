using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AppResourcesParameterNameMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private CSharpSourceScanner Scanner() => new(Path.Combine(_app.Root, "App"));

    private (string Source, MigrationResult Result) Migrate(string source)
    {
        _app.Write("logic/Handler.cs", source);
        var result = new AppResourcesParameterNameMigration(Scanner()).Migrate();
        return (_app.Read("logic/Handler.cs"), result);
    }

    [Fact]
    public void Renames_the_argument_on_the_three_methods_through_a_field_a_parameter_and_this()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler
            {
                private readonly IAppResources _appResources;
                public Handler(IAppResources appResources) => _appResources = appResources;

                public string Run(IAppResources other)
                {
                    var schema = _appResources.GetModelJsonSchema(modelId: "model");
                    var xsd = this._appResources.GetXsdSchema( modelId : "model");
                    var prefill = other.GetPrefillJson(dataModelName: "model");
                    return schema + xsd + prefill;
                }
            }
            """
        );

        Assert.Contains("_appResources.GetModelJsonSchema(dataTypeId: \"model\")", migrated);
        Assert.Contains("this._appResources.GetXsdSchema( dataTypeId : \"model\")", migrated);
        Assert.Contains("other.GetPrefillJson(dataTypeId: \"model\")", migrated);
        Assert.DoesNotContain("modelId", migrated);
        Assert.DoesNotContain("dataModelName", migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Equal(3, result.Warnings.Count(w => w.Contains("Handler.cs:", StringComparison.Ordinal)));
    }

    [Fact]
    public void Leaves_positional_arguments_and_other_receivers_alone()
    {
        const string source = """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppResources appResources, Other other)
            {
                public string Run()
                {
                    var schema = appResources.GetModelJsonSchema("model");
                    var prefill = appResources.GetPrefillJson();
                    var unrelated = other.GetModelJsonSchema(modelId: "model");
                    return schema + prefill + unrelated;
                }
            }
            """;

        var (migrated, result) = Migrate(source);

        Assert.Equal(source, migrated);
        Assert.Empty(result.Messages);
    }

    [Fact]
    public void Is_idempotent()
    {
        var (once, _) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppResources appResources)
            {
                public string Run() => appResources.GetXsdSchema(modelId: "model") ?? "";
            }
            """
        );

        var (twice, result) = Migrate(once);

        Assert.Equal(once, twice);
        Assert.Empty(result.Messages);
    }
}
