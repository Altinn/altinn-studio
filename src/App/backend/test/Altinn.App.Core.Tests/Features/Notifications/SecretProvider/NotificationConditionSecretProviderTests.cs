using Altinn.App.Core.Features.Notifications.Exceptions;
using Altinn.App.Core.Features.Notifications.SecretProvider;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Features.Notifications.SecretProvider;

public class NotificationConditionSecretProviderTests
{
    private readonly Mock<IOptionsMonitor<AppCodesSettings>> _optionsMonitorMock = new(MockBehavior.Strict);

    private NotificationConditionSecretProvider CreateSut() => new(_optionsMonitorMock.Object);

    private static AppCode MakeCode(string id, string code) =>
        new()
        {
            Id = id,
            Code = code,
            IssuedAt = DateTimeOffset.UtcNow,
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(62),
        };

    private void SetupCodes(List<AppCode> codes) =>
        _optionsMonitorMock.Setup(x => x.CurrentValue).Returns(new AppCodesSettings { NotificationCallback = codes });

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
    public void GetSigningSecret_EmptyCodes_Throws()
    {
        SetupCodes([]);

        Assert.Throws<NotificationConditionSecretNotFoundException>(() => CreateSut().GetSigningSecret());
    }

    [Fact]
    public void GetSigningSecret_NullCodes_Throws()
    {
        _optionsMonitorMock.Setup(x => x.CurrentValue).Returns(new AppCodesSettings { NotificationCallback = null! });

        Assert.Throws<NotificationConditionSecretNotFoundException>(() => CreateSut().GetSigningSecret());
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

        Assert.Throws<NotificationConditionSecretNotFoundException>(() => CreateSut().GetValidationSecrets());
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
