using Altinn.App.Core.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration.Json;

namespace Altinn.App.Core.Tests.Extensions;

public class ConfigurationBuilderExtensionsTest
{
    [Fact]
    public void AddAppSettingsSecretFile_IsSafeToCallMultipleTimes()
    {
        // Arrange
        var builder = WebApplication.CreateBuilder();

        // Act
        builder.Configuration.AddAppSettingsSecretFile(root: AppContext.BaseDirectory);
        builder.Configuration.AddAppSettingsSecretFile(root: AppContext.BaseDirectory);

        // Assert
        Assert.Single(
            builder.Configuration.Sources.OfType<JsonConfigurationSource>(),
            x => x.Path == ConfigurationBuilderExtensions.AppSettingsSecretsFile
        );
    }
}
