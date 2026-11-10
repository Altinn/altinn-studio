using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// End-to-end wiring check for moving validation issue text keys from Description to CustomTextKey: the step runs
/// after the text key renames, so a description set to a renamed key ends up on the new key. The csproj upgrade and
/// semantic analysis are skipped so the run stays offline and local.
/// </summary>
public sealed class V8Tov9UpgradeValidationDescriptionTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Fact]
    public async Task Upgrade_MovesADescriptionSetToARenamedTextKey_ToTheNewKey()
    {
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <PropertyGroup>
                <TargetFramework>net8.0</TargetFramework>
              </PropertyGroup>
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.6.5" />
                <PackageReference Include="Altinn.App.Core" Version="8.6.5" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            "config/texts/resource.nb.json",
            """
            {
              "language": "nb",
              "resources": [
                { "id": "date_picker.min_date_exeeded", "value": "For tidlig" }
              ]
            }
            """
        );
        _app.Write(
            "logic/Validator.cs",
            """
            using Altinn.App.Core.Models.Validation;
            public class Validator
            {
                public ValidationIssue Run() => new ValidationIssue { Description = "date_picker.min_date_exeeded" };
            }
            """
        );

        var report = new UpgradeReport();
        await V8Tov9Upgrade.RunAsync(
            new V8Tov9UpgradeOptions(
                ProjectFolder: _app.Root,
                ProjectFile: Path.Combine("App", "App.csproj"),
                TargetMajorVersion: 9,
                TargetFramework: "net10.0",
                SkipCsprojUpgrade: true,
                ConvertPackageReferences: false,
                StudioRoot: null,
                Report: report,
                Error: new StringWriter(),
                CancellationToken: TestContext.Current.CancellationToken,
                SkipSemanticAnalysis: true
            )
        );

        Assert.Contains("\"date_picker.min_date_exceeded\"", _app.Read("config/texts/resource.nb.json"));
        Assert.Contains(
            "new ValidationIssue { CustomTextKey = \"date_picker.min_date_exceeded\" }",
            _app.Read("logic/Validator.cs")
        );
        var step = Assert.Single(report.Steps, step => step.Name == "Validation issue text keys");
        Assert.Contains(step.Messages, message => message.Text.Contains("-> CustomTextKey"));
    }
}
