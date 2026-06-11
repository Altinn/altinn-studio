using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackSecretProviderTests
{
    private readonly Mock<IOptionsMonitor<AppCodesSettings>> _optionsMonitorMock = new(MockBehavior.Strict);

    private WorkflowCallbackSecretProvider CreateSut() => new(_optionsMonitorMock.Object);

    private static AppCode MakeCode(string id, string code, DateTimeOffset? expiresAt = null) =>
        new()
        {
            Id = id,
            Code = code,
            IssuedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt ?? DateTimeOffset.UtcNow.AddDays(186),
        };

    private void SetupCodes(List<AppCode> codes) =>
        _optionsMonitorMock.Setup(x => x.CurrentValue).Returns(new AppCodesSettings { WorkflowEngineCallback = codes });

    [Fact]
    public void GetSigningSecret_ReturnsFirstCode()
    {
        SetupCodes([MakeCode("id-1", "first-secret"), MakeCode("id-2", "second-secret")]);

        var result = CreateSut().GetSigningSecret();

        Assert.Equal("id-1", result.Id);
        Assert.Equal("first-secret", result.Code);
    }

    [Fact]
    public void GetSigningSecret_SingleCode_ReturnsIt()
    {
        SetupCodes([MakeCode("id-1", "only-secret")]);

        var result = CreateSut().GetSigningSecret();

        Assert.Equal("only-secret", result.Code);
    }

    [Fact]
    public void GetSigningSecret_FirstCodeExpired_ReturnsFirstNonExpiredCode()
    {
        SetupCodes([
            MakeCode("id-expired", "expired-secret", DateTimeOffset.UtcNow.AddDays(-1)),
            MakeCode("id-valid", "valid-secret"),
        ]);

        var result = CreateSut().GetSigningSecret();

        Assert.Equal("id-valid", result.Id);
    }

    [Fact]
    public void GetSigningSecret_OnlyExpiredCodes_Throws()
    {
        SetupCodes([MakeCode("id-expired", "expired-secret", DateTimeOffset.UtcNow.AddDays(-1))]);

        var ex = Assert.Throws<WorkflowCallbackSecretNotFoundException>(() => CreateSut().GetSigningSecret());
        Assert.Contains("expired", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GetSigningSecret_EmptyCodes_Throws()
    {
        SetupCodes([]);

        Assert.Throws<WorkflowCallbackSecretNotFoundException>(() => CreateSut().GetSigningSecret());
    }

    [Fact]
    public void GetSigningSecret_NullCodes_Throws()
    {
        _optionsMonitorMock.Setup(x => x.CurrentValue).Returns(new AppCodesSettings { WorkflowEngineCallback = null! });

        Assert.Throws<WorkflowCallbackSecretNotFoundException>(() => CreateSut().GetSigningSecret());
    }

    [Fact]
    public void GetValidationSecrets_ReturnsAllCodes()
    {
        var codes = new List<AppCode>
        {
            MakeCode("id-1", "first-secret"),
            MakeCode("id-2", "second-secret"),
            MakeCode("id-3", "third-secret"),
        };
        SetupCodes(codes);

        var result = CreateSut().GetValidationSecrets();

        Assert.Equal(3, result.Count);
        Assert.Equal("id-1", result[0].Id);
        Assert.Equal("id-2", result[1].Id);
        Assert.Equal("id-3", result[2].Id);
    }

    [Fact]
    public void GetValidationSecrets_EmptyCodes_Throws()
    {
        SetupCodes([]);

        Assert.Throws<WorkflowCallbackSecretNotFoundException>(() => CreateSut().GetValidationSecrets());
    }

    [Fact]
    public void GetValidationSecrets_SingleCode_ReturnsSingleItemList()
    {
        SetupCodes([MakeCode("id-1", "only-secret")]);

        var result = CreateSut().GetValidationSecrets();

        Assert.Single(result);
        Assert.Equal("only-secret", result[0].Code);
    }

    [Fact]
    public void GetSigningSecret_AlwaysReadsCurrentValue()
    {
        SetupCodes([MakeCode("id-1", "secret")]);

        CreateSut().GetSigningSecret();

        _optionsMonitorMock.Verify(x => x.CurrentValue, Times.Once);
    }

    [Fact]
    public void GetValidationSecrets_AlwaysReadsCurrentValue()
    {
        SetupCodes([MakeCode("id-1", "secret")]);

        CreateSut().GetValidationSecrets();

        _optionsMonitorMock.Verify(x => x.CurrentValue, Times.Once);
    }
}
