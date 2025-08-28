#nullable disable
using System.Text.Json;
using Altinn.App.Core.Infrastructure.Clients.KeyVault;
using FluentAssertions;
using Microsoft.Azure.KeyVault.WebKey;
using Microsoft.Extensions.Configuration;

namespace Altinn.App.Core.Tests.Infrastructure.Clients.KeyVault;

public class SecretsLocalClientTests
{
    public static IConfiguration GetConfiguration(params (string Key, string Value)[] keys) =>
        new ConfigurationBuilder().AddInMemoryCollection(keys.ToDictionary(k => k.Key, k => k.Value)).Build();

    [Fact]
    public async Task TestMissingSecretId_ThrowsException()
    {
        var sut = new SecretsLocalClient(GetConfiguration(("test", "value"), ("d", "e")));

        await sut.Invoking(s => s.GetCertificateAsync("certId")).Should().ThrowAsync<Exception>();
        await sut.Invoking(s => s.GetKeyAsync("certId")).Should().ThrowAsync<Exception>();
        await sut.Invoking(s => s.GetSecretAsync("certId")).Should().ThrowAsync<Exception>();
    }

    [Fact]
    public async Task TestCertificateFoundInConfiguration()
    {
        var certificate = new byte[20];
        Random.Shared.NextBytes(certificate); // Initialize with a randmo value

        var sut = new SecretsLocalClient(GetConfiguration(("certId", Convert.ToBase64String(certificate)), ("d", "e")));

        var certResult = await sut.GetCertificateAsync("certId");
        certResult.Should().BeEquivalentTo(certificate);
    }

    [Fact]
    public async Task TestSecretFoundInSecretsJson()
    {
        var sut = new SecretsLocalClient(GetConfiguration());

        var secretResult = await sut.GetSecretAsync("secretId");
        secretResult.Should().Be("local secret dummy data");
    }

    [Fact]
    public async Task TestKeyFoundInSecretsJson()
    {
        var jwk = new JsonWebKey() { CurveName = "sillyCurveForTest" };
        var jwkSerialized = JsonSerializer.Serialize(jwk);
        var sut = new SecretsLocalClient(GetConfiguration(("jwk", jwkSerialized)));

        var keyResult = await sut.GetKeyAsync("jwk");
        keyResult.Should().BeEquivalentTo(jwk);
        keyResult.CurveName.Should().Be("sillyCurveForTest");
    }
}
