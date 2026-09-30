using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Authentication;

public class WorkflowCallbackAppCodesValidatorTests
{
    private static AppCode MakeCode(
        DateTimeOffset expiresAt,
        string code = "a-code-that-is-long-enough-for-hmac",
        string id = "id"
    ) =>
        new()
        {
            Id = id,
            Code = code,
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

    [Fact]
    public void Validate_FirstCodeExpiredButAnotherValid_Succeeds()
    {
        var settings = new AppCodesSettings
        {
            WorkflowEngineCallback =
            [
                MakeCode(DateTimeOffset.UtcNow.AddDays(-1), id: "id-old"),
                MakeCode(DateTimeOffset.UtcNow.AddDays(10), id: "id-new"),
            ],
        };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public void Validate_CodeShorterThanMinimumKeyLength_Fails()
    {
        var settings = new AppCodesSettings
        {
            WorkflowEngineCallback = [MakeCode(DateTimeOffset.UtcNow.AddDays(10), code: "too-short")],
        };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Failed);
        Assert.Contains("128 bits", result.FailureMessage);
    }

    [Fact]
    public void Validate_DuplicateCodeIds_Fails()
    {
        var settings = new AppCodesSettings
        {
            WorkflowEngineCallback =
            [
                MakeCode(DateTimeOffset.UtcNow.AddDays(10), id: "duplicate-id"),
                MakeCode(DateTimeOffset.UtcNow.AddDays(20), id: "duplicate-id"),
            ],
        };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Failed);
        Assert.Contains("duplicate-id", result.FailureMessage);
    }

    [Fact]
    public void Validate_DistinctCodeIds_Succeeds()
    {
        var settings = new AppCodesSettings
        {
            WorkflowEngineCallback =
            [
                MakeCode(DateTimeOffset.UtcNow.AddDays(10), id: "id-1"),
                MakeCode(DateTimeOffset.UtcNow.AddDays(20), id: "id-2"),
            ],
        };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public void Validate_CodeOfExactlyMinimumKeyLength_Succeeds()
    {
        var settings = new AppCodesSettings
        {
            WorkflowEngineCallback = [MakeCode(DateTimeOffset.UtcNow.AddDays(10), code: "exactly-16-chars")],
        };

        var result = new WorkflowCallbackAppCodesValidator().Validate(null, settings);

        Assert.True(result.Succeeded);
    }
}
