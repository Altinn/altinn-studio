using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

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
    public void Renames_the_argument_on_a_null_conditional_call()
    {
        var (migrated, result) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppResources? appResources)
            {
                public string? Run() => appResources?.GetXsdSchema(modelId: "model");
            }
            """
        );

        Assert.Contains("appResources?.GetXsdSchema(dataTypeId: \"model\")", migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Single(result.Warnings, w => w.Contains("GetXsdSchema(modelId:) -> GetXsdSchema(dataTypeId:)"));
    }

    [Fact]
    public void Recognizes_receivers_declared_nullable_qualified_or_through_an_alias()
    {
        var (migrated, _) = Migrate(
            """
            using Altinn.App.Core.Internal.App;
            public class Handler
            {
                private readonly IAppResources? _nullable;
                private readonly Altinn.App.Core.Internal.App.IAppResources _qualified;
                public global::Altinn.App.Core.Internal.App.IAppResources? Aliased { get; init; }

                public Handler(Altinn.App.Core.Internal.App.IAppResources qualified, IAppResources? nullable)
                {
                    _qualified = qualified;
                    _nullable = nullable;
                }

                public string Run()
                {
                    var a = _nullable!.GetModelJsonSchema(modelId: "model");
                    var b = _qualified.GetXsdSchema(modelId: "model");
                    var c = this.Aliased!.GetPrefillJson(dataModelName: "model");
                    return a + b + c;
                }
            }
            """
        );

        Assert.DoesNotContain("modelId", migrated);
        Assert.DoesNotContain("dataModelName", migrated);
        Assert.Equal(3, migrated.Split("dataTypeId:").Length - 1);
    }

    [Fact]
    public void Renames_the_argument_on_a_null_conditional_call_with_a_semantic_model()
    {
        _app.Write(
            "logic/Handler.cs",
            """
            using Altinn.App.Core.Internal.App;
            public class Handler(IAppResources? appResources)
            {
                public string? Run() => appResources?.GetPrefillJson(dataModelName: "model");
            }
            """
        );
        var scanner = SemanticScannerFactory.CreateScanner(Path.Combine(_app.Root, "App"), _coreStub.Value);
        Assert.True(scanner.HasSemanticModels);

        var result = new AppResourcesParameterNameMigration(scanner).Migrate();

        Assert.Contains("appResources?.GetPrefillJson(dataTypeId: \"model\")", _app.Read("logic/Handler.cs"));
        Assert.False(result.RequiresManualFollowUp);
    }

    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Altinn.App.Core.Internal.App
            {
                public interface IAppResources
                {
                    string GetModelJsonSchema(string modelId);
                    string? GetXsdSchema(string modelId);
                    string? GetPrefillJson(string dataModelName = "ServiceModel");
                }
            }
            """
        )
    );

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
