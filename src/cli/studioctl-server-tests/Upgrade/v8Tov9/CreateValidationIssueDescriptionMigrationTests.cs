using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class CreateValidationIssueDescriptionMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private (string Source, MigrationResult Result) Migrate(string calls, bool semantic = true)
    {
        _app.Write(
            "logic/Validator.cs",
            $$"""
            using Altinn.App.Core.Features.Validation;
            using Altinn.App.Core.Models.Validation;

            public class Model
            {
                public string? Name { get; set; }
            }

            public class Validator : GenericFormDataValidator<Model>
            {
                public Validator() : base("model") { }

                public void Run(string key)
                {
            {{calls}}
                }
            }
            """
        );
        var appFolder = Path.Combine(_app.Root, "App");
        var scanner = semantic
            ? SemanticScannerFactory.CreateScanner(appFolder, _coreStub.Value)
            : new CSharpSourceScanner(appFolder);

        var result = new CreateValidationIssueDescriptionMigration(scanner).Migrate();
        return (_app.Read("logic/Validator.cs"), result);
    }

    [Theory]
    [InlineData(
        "CreateValidationIssue(m => m.Name, \"my.key\", description: \"my.key\");",
        "CreateValidationIssue(m => m.Name, \"my.key\");"
    )]
    [InlineData(
        "CreateValidationIssue(m => m.Name, key, ValidationIssueSeverity.Warning, key);",
        "CreateValidationIssue(m => m.Name, key, ValidationIssueSeverity.Warning);"
    )]
    [InlineData(
        "CreateValidationIssue(m => m.Name, \"my.key\", ValidationIssueSeverity.Error, \"my.key\", \"C1\");",
        "CreateValidationIssue(m => m.Name, \"my.key\", ValidationIssueSeverity.Error, code: \"C1\");"
    )]
    [InlineData(
        "CreateValidationIssue(description: key, textKey: key, selector: m => m.Name);",
        "CreateValidationIssue(textKey: key, selector: m => m.Name);"
    )]
    public void Removes_a_description_that_repeats_textKey(string before, string after)
    {
        var (migrated, result) = Migrate("        " + before);

        Assert.Contains(after, migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("so the description argument was removed"));
    }

    [Fact]
    public void Removes_a_repeated_description_on_its_own_line()
    {
        var (migrated, _) = Migrate(
            """
                    CreateValidationIssue(
                        m => m.Name,
                        "my.key",
                        ValidationIssueSeverity.Error,
                        "my.key"
                    );
            """
        );

        Assert.Contains(
            """
                    CreateValidationIssue(
                        m => m.Name,
                        "my.key",
                        ValidationIssueSeverity.Error
                    );
            """,
            migrated
        );
    }

    [Fact]
    public void Warns_when_the_description_differs_from_textKey()
    {
        const string calls =
            "        CreateValidationIssue(m => m.Name, \"my.key\", description: \"Name is required\");";

        var (migrated, result) = Migrate(calls);

        Assert.Contains(calls.Trim(), migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("Remove the description argument"));
        Assert.Contains(result.Warnings, w => w.EndsWith("Validator.cs:15", StringComparison.Ordinal));
    }

    [Fact]
    public void Leaves_calls_without_a_description()
    {
        const string calls = """
                    CreateValidationIssue(m => m.Name, "my.key");
                    CreateValidationIssue(m => m.Name, "my.key", description: null);
            """;

        var (migrated, result) = Migrate(calls);

        Assert.Contains(calls, migrated);
        Assert.Empty(result.Messages);
    }

    [Fact]
    public void Leaves_the_apps_own_CreateValidationIssue()
    {
        var source = """
            public class Helper
            {
                public void CreateValidationIssue(string selector, string textKey, string? description = null) { }

                public void Run() => CreateValidationIssue("a", "my.key", "my.key");
            }
            """;
        _app.Write("logic/Helper.cs", source);

        var (_, result) = Migrate("");

        Assert.Equal(source, _app.Read("logic/Helper.cs"));
        Assert.Empty(result.Messages);
    }

    [Fact]
    public void Without_a_semantic_model_handles_calls_in_a_GenericFormDataValidator_as_unverified()
    {
        var (migrated, result) = Migrate(
            "        CreateValidationIssue(m => m.Name, \"my.key\", description: \"my.key\");",
            semantic: false
        );

        Assert.Contains("CreateValidationIssue(m => m.Name, \"my.key\");", migrated);
        Assert.Contains(result.Warnings, w => w.Contains("(unverified"));
    }

    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            using System;
            using System.Collections.Generic;
            using System.Linq.Expressions;
            using Altinn.App.Core.Models.Validation;

            namespace Altinn.App.Core.Models.Validation
            {
                public enum ValidationIssueSeverity { Error = 1, Warning = 2 }
            }

            namespace Altinn.App.Core.Features.Validation
            {
                public abstract class GenericFormDataValidator<TModel>
                {
                    protected GenericFormDataValidator(string dataType) { }

                    protected void CreateValidationIssue<T>(
                        Expression<Func<TModel, T>> selector,
                        string textKey,
                        ValidationIssueSeverity severity = ValidationIssueSeverity.Error,
                        string? description = null,
                        string? code = null,
                        Dictionary<string, string>? customTextParameters = null
                    ) { }
                }
            }
            """
        )
    );
}
