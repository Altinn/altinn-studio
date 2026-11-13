using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackSecretProviderTests
{
    private static readonly DateTimeOffset _now = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IOptionsMonitor<AppCodesSettings>> _optionsMonitorMock = new(MockBehavior.Strict);
    private readonly FakeTimeProvider _time = new(_now);

    private WorkflowCallbackSecretProvider CreateSut() => new(_optionsMonitorMock.Object, _time);

    private static AppCode MakeCode(
        string id,
        string code,
        DateTimeOffset? issuedAt = null,
        DateTimeOffset? expiresAt = null
    ) =>
        new()
        {
            Id = id,
            Code = code,
            IssuedAt = issuedAt ?? _now.AddDays(-1),
            ExpiresAt = expiresAt ?? _now.AddDays(186),
        };

    private void SetupCodes(List<AppCode> codes) =>
        _optionsMonitorMock.Setup(x => x.CurrentValue).Returns(new AppCodesSettings { WorkflowEngineCallback = codes });

    [Fact]
    public void GetSigningSecret_ReturnsTheNewestCodePastTheGracePeriod()
    {
        SetupCodes([
            MakeCode("id-1", "first-secret", issuedAt: _now.AddDays(-1)),
            MakeCode("id-2", "second-secret", issuedAt: _now.AddDays(-25)),
        ]);

        var result = CreateSut().GetSigningSecret();

        Assert.Equal("id-1", result.Id);
        Assert.Equal("first-secret", result.Code);
    }

    [Fact]
    public void GetSigningSecret_NewCodeInsideTheGracePeriod_ReturnsThePreviousCode()
    {
        SetupCodes([
            MakeCode("id-new", "new-secret", issuedAt: _now.AddMinutes(-10)),
            MakeCode("id-old", "old-secret", issuedAt: _now.AddDays(-24)),
        ]);
        var sut = CreateSut();

        Assert.Equal("id-old", sut.GetSigningSecret().Id);

        _time.Advance(AppCodeRotation.SigningGracePeriod);

        Assert.Equal("id-new", sut.GetSigningSecret().Id);
    }

    [Fact]
    public void GetSigningSecret_NoCodePastTheGracePeriod_ReturnsTheNewest()
    {
        SetupCodes([MakeCode("id-1", "only-secret", issuedAt: _now.AddMinutes(-1))]);

        var result = CreateSut().GetSigningSecret();

        Assert.Equal("only-secret", result.Code);
    }

    [Fact]
    public void GetSigningSecret_FirstCodeExpired_ReturnsFirstNonExpiredCode()
    {
        SetupCodes([
            MakeCode("id-expired", "expired-secret", expiresAt: _now.AddDays(-1)),
            MakeCode("id-valid", "valid-secret", issuedAt: _now.AddDays(-2)),
        ]);

        var result = CreateSut().GetSigningSecret();

        Assert.Equal("id-valid", result.Id);
    }

    [Fact]
    public void GetSigningSecret_OnlyExpiredCodes_Throws()
    {
        SetupCodes([MakeCode("id-expired", "expired-secret", expiresAt: _now.AddDays(-1))]);

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
    public void GetValidationSecrets_IncludesACodeInsideTheGracePeriod()
    {
        SetupCodes([
            MakeCode("id-new", "new-secret", issuedAt: _now.AddMinutes(-10)),
            MakeCode("id-old", "old-secret", issuedAt: _now.AddDays(-24)),
        ]);

        var result = CreateSut().GetValidationSecrets();

        Assert.Contains(result, c => c.Id == "id-new");
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
