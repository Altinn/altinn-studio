using Altinn.Augmenter.Agent.Configuration;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;

namespace Altinn.Augmenter.Agent.Tests.Unit.Configuration;

public class SecretFileConfigurationExtensionsTests
{
    [Fact]
    public void AddAltinnPlatformSecretFile_WhenDirectoryMissing_IsNoOp()
    {
        var missingRoot = Path.Combine(Path.GetTempPath(), "augmenter-secrets-missing-" + Guid.NewGuid());
        var builder = new ConfigurationBuilder();

        var act = () => builder.AddAltinnPlatformSecretFile(root: missingRoot);

        act.Should().NotThrow();
        var config = builder.Build();
        config["Agent:ApiKey"].Should().BeNull();
    }

    [Fact]
    public void AddAltinnPlatformSecretFile_WhenFilePresent_LoadsValuesIntoConfiguration()
    {
        var root = Path.Combine(Path.GetTempPath(), "augmenter-secrets-" + Guid.NewGuid());
        Directory.CreateDirectory(root);
        try
        {
            File.WriteAllText(
                Path.Combine(root, SecretFileConfigurationExtensions.DefaultFileName),
                "{\"Agent\":{\"ApiKey\":\"override-from-file\"}}");

            var builder = new ConfigurationBuilder();
            builder.AddAltinnPlatformSecretFile(root: root);

            var config = builder.Build();
            config["Agent:ApiKey"].Should().Be("override-from-file");
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void AddAltinnPlatformSecretFile_CalledTwice_DoesNotDuplicateSource()
    {
        var root = Path.Combine(Path.GetTempPath(), "augmenter-secrets-dup-" + Guid.NewGuid());
        Directory.CreateDirectory(root);
        try
        {
            File.WriteAllText(
                Path.Combine(root, SecretFileConfigurationExtensions.DefaultFileName),
                "{}");

            var builder = new ConfigurationBuilder();
            builder.AddAltinnPlatformSecretFile(root: root);
            builder.AddAltinnPlatformSecretFile(root: root);

            builder.Sources
                .OfType<JsonConfigurationSource>()
                .Count(s => s.Path == SecretFileConfigurationExtensions.DefaultFileName)
                .Should().Be(1);
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }

    [Fact]
    public void AddAltinnPlatformSecretFile_EnvVarOverridesFileValue()
    {
        var root = Path.Combine(Path.GetTempPath(), "augmenter-secrets-envwin-" + Guid.NewGuid());
        Directory.CreateDirectory(root);
        try
        {
            File.WriteAllText(
                Path.Combine(root, SecretFileConfigurationExtensions.DefaultFileName),
                "{\"Agent\":{\"ApiKey\":\"from-file\"}}");

            var builder = new ConfigurationBuilder();
            builder.AddAltinnPlatformSecretFile(root: root);
            builder.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Agent:ApiKey"] = "from-env",
            });

            var config = builder.Build();
            config["Agent:ApiKey"].Should().Be("from-env");
        }
        finally
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
