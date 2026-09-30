using System.Net;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ServiceOwnerAuthorizationDiagnosticsTests
{
    private static PlatformHttpException Platform(HttpStatusCode statusCode) =>
        new(statusCode, $"Platform call failed with {statusCode}");

    [Fact]
    public void Recognises_A_Forbidden_Platform_Call()
    {
        Assert.True(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(Platform(HttpStatusCode.Forbidden)));
    }

    [Fact]
    public void Recognises_A_Forbidden_Platform_Call_Wrapped_In_Another_Exception()
    {
        var wrapped = new InvalidOperationException("saving failed", Platform(HttpStatusCode.Forbidden));

        Assert.True(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(wrapped));
    }

    [Fact]
    public void Recognises_A_Forbidden_Platform_Call_Inside_An_AggregateException()
    {
        var aggregate = new AggregateException(
            new InvalidOperationException("unrelated"),
            Platform(HttpStatusCode.Forbidden)
        );

        Assert.True(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(aggregate));
    }

    [Fact]
    public void Does_Not_Recognise_Unauthorized()
    {
        // A 401 means the token was missing, expired or could not be obtained - transient, and not
        // something a policy change fixes.
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(Platform(HttpStatusCode.Unauthorized)));
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.BadRequest)]
    public void Does_Not_Recognise_Other_Platform_Failures(HttpStatusCode statusCode)
    {
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(Platform(statusCode)));
    }

    [Fact]
    public void Does_Not_Recognise_A_Plain_Exception()
    {
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(new TimeoutException()));
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsAuthorizationDenied(null));
    }

    [Fact]
    public void Describes_The_App_Owner_The_Policy_File_And_The_Task_Actions()
    {
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(
            new ApplicationMetadata("ttd/myapp"),
            "Task_2",
            "confirmation"
        );

        Assert.Contains("'ttd'", description, StringComparison.Ordinal);
        Assert.Contains("ttd/myapp", description, StringComparison.Ordinal);
        Assert.Contains("config/authorization/policy.xml", description, StringComparison.Ordinal);
        Assert.Contains("read, write", description, StringComparison.Ordinal);
        // A confirmation task advances with 'confirm' only - naming it is the whole point.
        Assert.Contains("Task_2", description, StringComparison.Ordinal);
        Assert.Contains("[confirm]", description, StringComparison.Ordinal);
        Assert.Contains("v8 to v9 upgrade", description, StringComparison.Ordinal);
    }

    [Fact]
    public void Describes_Without_A_Task_When_The_Process_Has_Ended()
    {
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(
            new ApplicationMetadata("ttd/myapp"),
            currentTaskId: null,
            altinnTaskType: null
        );

        Assert.Contains("config/authorization/policy.xml", description, StringComparison.Ordinal);
        Assert.DoesNotContain("Advancing the current task", description, StringComparison.Ordinal);
    }

    [Fact]
    public void States_Its_Own_Precondition_Because_Any_403_Reaches_It()
    {
        // Hook and service-task commands wrap exceptions from app-implemented handlers, so a 403 from
        // a platform call an app's own handler makes lands here too. The message may not assert that
        // the app's policy is at fault when it cannot know that.
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(
            new ApplicationMetadata("ttd/myapp"),
            "Task_1",
            "data"
        );

        Assert.Contains("If it was one the app makes on its own behalf", description, StringComparison.Ordinal);
        Assert.Contains("your own handler makes is unrelated", description, StringComparison.Ordinal);
    }

    [Fact]
    public void Sanitizes_The_Task_Values_It_Logs()
    {
        // The task id and type arrive with the callback payload.
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(
            new ApplicationMetadata("ttd/myapp"),
            "Task_1\r\nFATAL: forged log line",
            "data"
        );

        Assert.DoesNotContain("\n", description, StringComparison.Ordinal);
        Assert.DoesNotContain("\r", description, StringComparison.Ordinal);
        Assert.Contains("Task_1FATAL: forged log line", description, StringComparison.Ordinal);
    }

    [Fact]
    public void A_Failed_Result_Flags_The_Denial_Without_Changing_The_Retry_Classification()
    {
        var result = FailedProcessEngineCommandResult.Retryable(Platform(HttpStatusCode.Forbidden));

        Assert.True(result.ServiceOwnerAuthorizationDenied);
        // The diagnosis is an explanation, not a reclassification: a 403 stays retryable so the
        // engine's behaviour and the caller's response are unchanged.
        Assert.False(result.NonRetryable);
    }

    [Fact]
    public void A_Failed_Result_From_Any_Other_Exception_Is_Not_Flagged()
    {
        Assert.False(
            FailedProcessEngineCommandResult.Retryable(new TimeoutException()).ServiceOwnerAuthorizationDenied
        );
        Assert.False(
            FailedProcessEngineCommandResult.Retryable("something went wrong").ServiceOwnerAuthorizationDenied
        );
        Assert.False(FailedProcessEngineCommandResult.Permanent("invalid payload").ServiceOwnerAuthorizationDenied);
    }
}
