using Altinn.Studio.Cli.Upgrade.v8Tov9;

namespace Studioctl.Tests.Upgrade.v8Tov9;

public sealed class AppTargetFrameworkMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    [Theory]
    [InlineData("net8.0", "net11.0")]
    [InlineData("net10.0", "net11.0")]
    [InlineData("net11.0", "net11.0")]
    [InlineData("net10.0-windows", "net11.0-windows")]
    public void Inspect_PlansSupportedLiteralFrameworks(string current, string desired)
    {
        var project = _app.Write(
            "App.csproj",
            $"<Project><PropertyGroup><TargetFramework>{current}</TargetFramework></PropertyGroup></Project>"
        );
        var original = _app.Read("App.csproj");

        var inspection = AppTargetFrameworkMigration.Inspect(project, "net11.0");

        Assert.Equal(new AppTargetFrameworkMigration.Plan(current, desired), inspection.Plan);
        Assert.Empty(inspection.Result.Messages);
        Assert.Equal(original, _app.Read("App.csproj"));
    }

    [Theory]
    [InlineData("<Project />")]
    [InlineData(
        "<Project><PropertyGroup><TargetFrameworks>net10.0;net11.0</TargetFrameworks></PropertyGroup></Project>"
    )]
    [InlineData(
        "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework><TargetFramework>net11.0</TargetFramework></PropertyGroup></Project>"
    )]
    [InlineData(
        "<Project><PropertyGroup Condition=\"'$(Configuration)' == 'Debug'\"><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
    )]
    [InlineData(
        "<Project><PropertyGroup><TargetFramework Condition=\"'$(Configuration)' == 'Debug'\">net10.0</TargetFramework></PropertyGroup></Project>"
    )]
    [InlineData("<Project><TargetFramework>net10.0</TargetFramework></Project>")]
    [InlineData(
        "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup><Import Project=\"custom.props\" /></Project>"
    )]
    [InlineData(
        "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework><DirectoryBuildPropsPath>custom.props</DirectoryBuildPropsPath></PropertyGroup></Project>"
    )]
    public void Inspect_RefusesUnsupportedDeclarationShapes(string xml)
    {
        var project = _app.Write("App.csproj", xml);

        var inspection = AppTargetFrameworkMigration.Inspect(project, "net11.0");

        Assert.Null(inspection.Plan);
        Assert.True(inspection.Result.RequiresManualFollowUp);
        Assert.Contains("explicit, unconditional TargetFramework", Assert.Single(inspection.Result.Todos));
        Assert.Equal(xml, _app.Read("App.csproj"));
    }

    [Theory]
    [InlineData("$(AppTargetFramework)")]
    [InlineData("netstandard2.1")]
    public void Inspect_RefusesFrameworksItCannotInterpretAsLiteralNetVersions(string framework)
    {
        var project = _app.Write(
            "App.csproj",
            $"<Project><PropertyGroup><TargetFramework>{framework}</TargetFramework></PropertyGroup></Project>"
        );

        var inspection = AppTargetFrameworkMigration.Inspect(project, "net11.0");

        Assert.Null(inspection.Plan);
        Assert.Contains("single literal TargetFramework", Assert.Single(inspection.Result.Todos));
    }

    [Fact]
    public void Inspect_RefusesToDowngradeANewerFramework()
    {
        var project = _app.Write(
            "App.csproj",
            "<Project><PropertyGroup><TargetFramework>net12.0</TargetFramework></PropertyGroup></Project>"
        );

        var inspection = AppTargetFrameworkMigration.Inspect(project, "net11.0");

        Assert.Null(inspection.Plan);
        Assert.Contains("Kept newer target framework net12.0", Assert.Single(inspection.Result.Todos));
    }

    [Theory]
    [InlineData(
        "Directory.Build.props",
        "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
    )]
    [InlineData(
        "Directory.Build.targets",
        "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
    )]
    [InlineData("Directory.Build.props", "<Project><Import Project=\"custom.props\" /></Project>")]
    public void Inspect_RefusesFrameworkSettingsInStandardDirectoryImports(string fileName, string xml)
    {
        var project = _app.Write(
            "App.csproj",
            "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
        );
        _app.Write("../" + fileName, xml);

        var inspection = AppTargetFrameworkMigration.Inspect(project, "net11.0");

        Assert.Null(inspection.Plan);
        Assert.Contains("resolve imported framework settings manually", Assert.Single(inspection.Result.Todos));
    }

    [Fact]
    public void Inspect_AcceptsDirectoryImportsWithoutFrameworkSettings()
    {
        var project = _app.Write(
            "App.csproj",
            "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"
        );
        _app.Write(
            "../Directory.Build.props",
            "<Project><PropertyGroup><Nullable>enable</Nullable></PropertyGroup></Project>"
        );

        var inspection = AppTargetFrameworkMigration.Inspect(project, "net11.0");

        Assert.Equal(new AppTargetFrameworkMigration.Plan("net10.0", "net11.0"), inspection.Plan);
        Assert.Empty(inspection.Result.Messages);
    }
}
