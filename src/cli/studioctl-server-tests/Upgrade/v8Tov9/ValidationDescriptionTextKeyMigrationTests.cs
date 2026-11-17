using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class ValidationDescriptionTextKeyMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public ValidationDescriptionTextKeyMigrationTests()
    {
        _app.Write(
            "config/texts/resource.nb.json",
            """
            {
              "language": "nb",
              "resources": [
                { "id": "my.error", "value": "Noe er galt" },
                { "id": "date_picker.min_date_exceeded", "value": "For tidlig" }
              ]
            }
            """
        );
    }

    public void Dispose() => _app.Dispose();

    private async Task<(string Source, MigrationResult Result)> Migrate(string source, bool semantic = true)
    {
        _app.Write("logic/Validator.cs", source);
        var appFolder = Path.Combine(_app.Root, "App");
        var scanner = semantic
            ? SemanticScannerFactory.CreateScanner(appFolder, _coreStub.Value)
            : new CSharpSourceScanner(appFolder);
        var textIds = await AppTextResources.ReadIds(_app.Root);
        var renamed = TextResourceKeyMigration.KeyRenames.ToDictionary(r => r.Old, r => r.New);

        var result = new ValidationDescriptionTextKeyMigration(scanner, textIds, renamed).Migrate();
        return (_app.Read("logic/Validator.cs"), result);
    }

    [Fact]
    public async Task Moves_a_text_key_in_an_object_initializer()
    {
        var (migrated, result) = await Migrate(
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() => new ValidationIssue { Description = "my.error", Field = "a" };
            }
            """
        );

        Assert.Contains("new ValidationIssue { CustomTextKey = \"my.error\", Field = \"a\" }", migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(
            result.Warnings,
            w => w.Contains("Validator.cs:4: Description = \"my.error\" -> CustomTextKey")
        );
    }

    [Fact]
    public async Task Moves_a_text_key_in_a_target_typed_initializer()
    {
        var (migrated, _) = await Migrate(
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() => new() { Description = "my.error" };
            }
            """
        );

        Assert.Contains("new() { CustomTextKey = \"my.error\" }", migrated);
    }

    [Fact]
    public async Task Moves_a_key_the_upgrade_renamed_to_the_new_key()
    {
        var (migrated, result) = await Migrate(
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() => new ValidationIssue { Description = "date_picker.min_date_exeeded" };
            }
            """
        );

        Assert.Contains("new ValidationIssue { CustomTextKey = \"date_picker.min_date_exceeded\" }", migrated);
        Assert.Contains(result.Warnings, w => w.Contains("-> CustomTextKey = \"date_picker.min_date_exceeded\""));
    }

    [Fact]
    public async Task Leaves_assignments_constants_run_time_values_and_texts()
    {
        var source = """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                private const string Key = "my.error";

                public ValidationIssue A()
                {
                    var issue = new ValidationIssue();
                    issue.Description = "my.error";
                    return issue;
                }

                public ValidationIssue B() => new ValidationIssue { Description = Key };
                public ValidationIssue C(string field) => new ValidationIssue { Description = $"{field} is wrong" };
                public ValidationIssue D() => new ValidationIssue { Description = "Something is wrong" };
            }
            """;

        var (migrated, result) = await Migrate(source);

        Assert.Equal(source, migrated);
        Assert.Empty(result.Messages);
    }

    [Theory]
    [InlineData("\"my.error\"")]
    [InlineData("\"Something is wrong\"")]
    public async Task Warns_when_custom_text_key_is_set_too(string description)
    {
        var source = $$"""
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() =>
                    new ValidationIssue { Description = {{description}}, CustomTextKey = "other.error" };
            }
            """;

        var (migrated, result) = await Migrate(source);

        Assert.Equal(source, migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("v9 only uses CustomTextKey"));
        Assert.Contains(result.Warnings, w => w.EndsWith("Validator.cs:5", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData(
        "new ValidationIssue { Description = \"my.error\", CustomTextKey = \"my.error\" }",
        "new ValidationIssue { CustomTextKey = \"my.error\" }"
    )]
    [InlineData(
        "new ValidationIssue { CustomTextKey = \"my.error\", Description = \"my.error\" }",
        "new ValidationIssue { CustomTextKey = \"my.error\" }"
    )]
    [InlineData(
        "new ValidationIssue { Field = \"a\", Description = key, CustomTextKey = key }",
        "new ValidationIssue { Field = \"a\", CustomTextKey = key }"
    )]
    public async Task Removes_Description_when_it_repeats_CustomTextKey(string before, string after)
    {
        var (migrated, result) = await Migrate(
            $$"""
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run(string key) => {{before}};
            }
            """
        );

        Assert.Contains(after, migrated);
        Assert.False(result.RequiresManualFollowUp);
        Assert.Contains(result.Warnings, w => w.Contains("so Description was removed"));
        Assert.Contains(result.Warnings, w => w.EndsWith("Validator.cs:4", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Removes_a_repeated_Description_on_its_own_line()
    {
        var (migrated, _) = await Migrate(
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() =>
                    new ValidationIssue
                    {
                        Field = "a",
                        Description = "my.error",
                        CustomTextKey = "my.error",
                    };
            }
            """
        );

        Assert.Contains(
            """
                    new ValidationIssue
                    {
                        Field = "a",
                        CustomTextKey = "my.error",
                    };
            """,
            migrated
        );
    }

    [Fact]
    public async Task Leaves_the_apps_own_types()
    {
        var source = """
            public class MyIssue
            {
                public string? Description { get; set; }
                public string? CustomTextKey { get; set; }
            }

            public class ValidationIssueWithSource
            {
                public string? Description { get; set; }
            }

            public class Validator
            {
                public object A() => new MyIssue { Description = "my.error" };
                public object B() => new MyIssue { Description = "my.error", CustomTextKey = "my.error" };
                public object C() => new ValidationIssueWithSource { Description = "my.error" };
            }
            """;

        var (migrated, result) = await Migrate(source);

        Assert.Equal(source, migrated);
        Assert.Empty(result.Messages);
    }

    [Fact]
    public async Task Without_a_semantic_model_moves_only_explicit_ValidationIssue_initializers_as_unverified()
    {
        var (migrated, result) = await Migrate(
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue A() => new ValidationIssue { Description = "my.error" };
                public ValidationIssue B() => new() { Description = "my.error" };
            }
            """,
            semantic: false
        );

        Assert.Contains("new ValidationIssue { CustomTextKey = \"my.error\" }", migrated);
        Assert.Contains("new() { Description = \"my.error\" }", migrated);
        Assert.Contains(result.Warnings, w => w.Contains("(unverified"));
    }

    [Fact]
    public async Task Is_idempotent()
    {
        var (once, _) = await Migrate(
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() => new ValidationIssue { Description = "my.error" };
            }
            """
        );

        var (twice, result) = await Migrate(once);

        Assert.Equal(once, twice);
        Assert.Empty(result.Messages);
    }

    private static readonly Lazy<MetadataReference> _coreStub = new(static () =>
        SemanticScannerFactory.EmitStubAssembly(
            "Altinn.App.Core",
            """
            namespace Altinn.App.Core.Models.Validation
            {
                public class ValidationIssue
                {
                    public string? Field { get; set; }
                    public string? Description { get; set; }
                    public string? CustomTextKey { get; set; }
                }
            }
            """
        )
    );
}
