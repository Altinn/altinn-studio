using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation.ProcessModeling;
using Xunit;

namespace Designer.Tests.Services;

public sealed class FiksArkivRoutingReaderTests : IDisposable
{
    private readonly string _directory = Directory.CreateTempSubdirectory().FullName;

    [Fact]
    public async Task MissingSettings_UsesRuntimeDefaults()
    {
        Assert.Equal(new FiksArkivRouting(null, "reject"), await Read());
    }

    [Fact]
    public async Task CustomActions_ReadsCaseInsensitiveConfigurationAndJsonComments()
    {
        await File.WriteAllTextAsync(
            Path.Combine(_directory, "appsettings.json"),
            """
            { // .NET configuration is case insensitive
              "fiksarkivsettings": {
                "SuccessHandling": { "Action": "archived" },
                "ErrorHandling": { "Action": "failed" },
              }
            }
            """
        );
        Assert.Equal(new FiksArkivRouting("archived", "failed"), await Read());
    }

    [Theory]
    [InlineData("null")]
    [InlineData("\" \"")]
    public async Task EmptyActions_UseRuntimeDefaults(string value)
    {
        await File.WriteAllTextAsync(
            Path.Combine(_directory, "appsettings.json"),
            """{"FiksArkivSettings":{"successHandling":{"action":VALUE},"errorHandling":{"action":VALUE}}}""".Replace(
                "VALUE",
                value
            )
        );
        Assert.Equal(new FiksArkivRouting(null, "reject"), await Read());
    }

    [Fact]
    public async Task DifferentEnvironmentActions_DoNotGuessOutcomeMapping()
    {
        await File.WriteAllTextAsync(
            Path.Combine(_directory, "appsettings.Production.json"),
            """{"FiksArkivSettings":{"errorHandling":{"action":"archiveFailed"}}}"""
        );
        Assert.Equal("environmentDependent", (await Read()).UnavailableReason);
    }

    [Fact]
    public async Task UnrelatedEnvironmentSettings_DoNotChangeMapping()
    {
        await File.WriteAllTextAsync(
            Path.Combine(_directory, "appsettings.Production.json"),
            """{"Logging":{"LogLevel":{"Default":"Information"}}}"""
        );
        Assert.Equal(new FiksArkivRouting(null, "reject"), await Read());
    }

    [Theory]
    [InlineData("services.ConfigureFiksArkiv(\"OtherSection\");")]
    [InlineData("services.AddFiksArkiv().WithFiksArkivConfig(options => options.ErrorHandling.Action = \"custom\");")]
    [InlineData("services.Configure<FiksArkivSettings>(options => options.ErrorHandling.Action = \"custom\");")]
    public async Task CodeConfiguration_IsReportedAsUnavailable(string source)
    {
        await File.WriteAllTextAsync(Path.Combine(_directory, "Program.cs"), source);
        Assert.Equal("customConfiguration", (await Read()).UnavailableReason);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{"FiksArkivSettings":{"errorHandling":{"action":["reject"]}}}""")]
    public async Task InvalidSettings_DoNotFallBackToDefaults(string json)
    {
        await File.WriteAllTextAsync(Path.Combine(_directory, "appsettings.json"), json);
        Assert.Equal("invalidConfiguration", (await Read()).UnavailableReason);
    }

    [Fact]
    public async Task IdenticalActions_CannotDistinguishOutcomes()
    {
        await File.WriteAllTextAsync(
            Path.Combine(_directory, "appsettings.json"),
            """{"FiksArkivSettings":{"successHandling":{"action":"reject"}}}"""
        );
        Assert.Equal("identicalActions", (await Read()).UnavailableReason);
    }

    private Task<FiksArkivRouting> Read() => FiksArkivRoutingReader.ReadAsync(_directory, CancellationToken.None);

    public void Dispose() => Directory.Delete(_directory, recursive: true);
}
