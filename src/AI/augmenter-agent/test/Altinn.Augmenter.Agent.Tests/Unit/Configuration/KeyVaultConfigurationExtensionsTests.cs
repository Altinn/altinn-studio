using Altinn.Augmenter.Agent.Configuration;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;

namespace Altinn.Augmenter.Agent.Tests.Unit.Configuration;

public class KeyVaultConfigurationExtensionsTests
{
    [Fact]
    public void AddOptionalAzureKeyVault_WhenSectionEmpty_IsNoOp()
    {
        var builder = WebApplication.CreateBuilder();
        var beforeCount = builder.Configuration.Sources.Count;

        var act = () => builder.AddOptionalAzureKeyVault();

        act.Should().NotThrow();
        builder.Configuration.Sources.Count.Should().Be(beforeCount);
    }

    [Fact]
    public void AddOptionalAzureKeyVault_WhenPartiallySet_IsNoOp()
    {
        var builder = WebApplication.CreateBuilder();
        ((IConfigurationBuilder)builder.Configuration).AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["kvSetting:SecretUri"] = "https://example-vault.vault.azure.net/",
            ["kvSetting:ClientId"] = "client",
            // ClientSecret + TenantId intentionally missing
        });
        var beforePostAdd = builder.Configuration.Sources.Count;

        var act = () => builder.AddOptionalAzureKeyVault();

        act.Should().NotThrow();
        builder.Configuration.Sources.Count.Should().Be(beforePostAdd);
    }

    // Note: there is intentionally no "fully configured → source added" unit
    // test. The Azure Key Vault provider eagerly authenticates and lists
    // secrets when registered, so a fake vault URL fails fast with a
    // SocketException. That fail-fast IS the desired production behavior
    // (misconfigured Key Vault should crash startup rather than silently
    // continue with empty secrets). Real connection is exercised in
    // production deployment, not from unit tests.
}
