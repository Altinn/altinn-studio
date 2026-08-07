using Altinn.App.Ai.Enrichment.Configuration;
using Altinn.App.Ai.Enrichment.ServiceTasks;
using Altinn.App.Core.Internal.Secrets;
using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;

namespace Altinn.App.Ai.Enrichment.Tests.Unit.ServiceTasks;

public class SecretsApiKeyProviderTests
{
    [Fact]
    public async Task ConfiguredApiKey_WinsWithoutTouchingSecrets()
    {
        var secrets = Substitute.For<ISecretsClient>();
        var sut = new SecretsApiKeyProvider(
            Options.Create(new AgentOptions { ApiKey = "direct-key", ApiKeySecretName = "unused" }),
            secrets);

        var key = await sut.GetApiKeyAsync();

        key.Should().Be("direct-key");
        await secrets.DidNotReceive().GetSecretAsync(Arg.Any<string>());
    }

    [Fact]
    public async Task SecretName_FetchesOnceAndCaches()
    {
        var secrets = Substitute.For<ISecretsClient>();
        secrets.GetSecretAsync("gateway-key").Returns(Task.FromResult("from-vault"));
        var sut = new SecretsApiKeyProvider(
            Options.Create(new AgentOptions { ApiKeySecretName = "gateway-key" }),
            secrets);

        (await sut.GetApiKeyAsync()).Should().Be("from-vault");
        (await sut.GetApiKeyAsync()).Should().Be("from-vault");

        await secrets.Received(1).GetSecretAsync("gateway-key");
    }

    [Fact]
    public async Task NothingConfigured_ThrowsWithGuidance()
    {
        var sut = new SecretsApiKeyProvider(
            Options.Create(new AgentOptions()),
            Substitute.For<ISecretsClient>());

        var act = async () => await sut.GetApiKeyAsync();

        await act.Should().ThrowAsync<InvalidOperationException>().WithMessage("*ApiKeySecretName*");
    }
}
