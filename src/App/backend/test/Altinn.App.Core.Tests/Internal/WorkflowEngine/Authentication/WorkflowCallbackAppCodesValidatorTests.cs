using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackAppCodesValidatorTests
{
    private static AppCode MakeCode(DateTimeOffset expiresAt) =>
        new()
        {
            Id = "id",
            Code = "code",
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = expiresAt,
        };

    [Fact]
    public void Validate_WithNonExpiredCode_Succeeds()
    {
        var settings = new AppCodesSettings { WorkflowEngineCallback = [MakeCode(DateTimeOffset.UtcNow.AddDays(10))] };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public void Validate_EmptyList_Fails()
    {
        var settings = new AppCodesSettings { WorkflowEngineCallback = [] };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Failed);
        Assert.Contains("not configured", result.FailureMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Validate_NullList_Fails()
    {
        var settings = new AppCodesSettings { WorkflowEngineCallback = null! };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Failed);
    }

    [Fact]
    public void Validate_OnlyExpiredCodes_Fails()
    {
        var settings = new AppCodesSettings { WorkflowEngineCallback = [MakeCode(DateTimeOffset.UtcNow.AddDays(-1))] };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Failed);
        Assert.Contains("expired", result.FailureMessage, StringComparison.OrdinalIgnoreCase);
    }
}
