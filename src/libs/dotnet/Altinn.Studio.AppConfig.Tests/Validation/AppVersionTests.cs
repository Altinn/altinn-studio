using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;
using Xunit;

namespace Altinn.Studio.AppConfig.Tests.Validation;

public sealed class AppVersionTests
{
    private static AppModel Build(string csproj) =>
        AppConfigEngine
            .Open(
                new InMemoryAppDirectory(
                    new() { ["App/config/applicationmetadata.json"] = TestMeta.Json(), ["App/App.csproj"] = csproj }
                )
            )
            .Build();

    private static string Csproj(string reference) =>
        $"""<Project Sdk="Microsoft.NET.Sdk.Web"><ItemGroup>{reference}</ItemGroup></Project>""";

    [Theory]
    [InlineData("9.1.0", "9.1.0")]
    [InlineData("9.0.0-preview.5", "9.0.0-preview.5")]
    [InlineData("9.*", null)]
    public void PackageVersion_IsStoredOnlyWhenExact(string declared, string? expected)
    {
        var model = Build(Csproj($"""<PackageReference Include="Altinn.App.Api" Version="{declared}" />"""));

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Equal(expected, model.AltinnAppVersion);
    }

    [Fact]
    public void UnsupportedVersion_StoresNothing()
    {
        var model = Build(Csproj("""<PackageReference Include="Altinn.App.Api" Version="8.12.0" />"""));

        Assert.NotNull(model.UnsupportedAppVersion);
        Assert.Null(model.AltinnAppVersion);
    }

    [Fact]
    public void SourceBuild_StoresNothing()
    {
        var model = Build(Csproj("""<ProjectReference Include="../../app-lib/Altinn.App.Api.csproj" />"""));

        Assert.Null(model.UnsupportedAppVersion);
        Assert.Null(model.AltinnAppVersion);
    }
}
