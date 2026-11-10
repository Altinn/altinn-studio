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
        Assert.True(ServiceOwnerAuthorizationDiagnostics.IsForbidden(Platform(HttpStatusCode.Forbidden)));
    }

    [Fact]
    public void Recognises_A_Forbidden_Platform_Call_Wrapped_In_Another_Exception()
    {
        var wrapped = new InvalidOperationException("saving failed", Platform(HttpStatusCode.Forbidden));

        Assert.True(ServiceOwnerAuthorizationDiagnostics.IsForbidden(wrapped));
    }

    [Fact]
    public void Recognises_A_Forbidden_Platform_Call_Inside_An_AggregateException()
    {
        var aggregate = new AggregateException(
            new InvalidOperationException("unrelated"),
            Platform(HttpStatusCode.Forbidden)
        );

        Assert.True(ServiceOwnerAuthorizationDiagnostics.IsForbidden(aggregate));
    }

    [Fact]
    public void Does_Not_Recognise_Unauthorized()
    {
        // A 401 means the token was missing, expired or could not be obtained - transient, and not
        // something a policy change fixes.
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsForbidden(Platform(HttpStatusCode.Unauthorized)));
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.BadRequest)]
    public void Does_Not_Recognise_Other_Platform_Failures(HttpStatusCode statusCode)
    {
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsForbidden(Platform(statusCode)));
    }

    [Fact]
    public void Does_Not_Recognise_A_Plain_Exception()
    {
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsForbidden(new TimeoutException()));
        Assert.False(ServiceOwnerAuthorizationDiagnostics.IsForbidden(null));
    }

    [Fact]
    public void Describes_The_App_Owner_The_Policy_File_And_The_Required_Actions()
    {
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(new ApplicationMetadata("ttd/myapp"));

        Assert.Contains("'ttd'", description, StringComparison.Ordinal);
        Assert.Contains("ttd/myapp", description, StringComparison.Ordinal);
        Assert.Contains("config/authorization/policy.xml", description, StringComparison.Ordinal);
        Assert.Contains("read, write", description, StringComparison.Ordinal);
        Assert.Contains("[complete] in the process state", description, StringComparison.Ordinal);
        Assert.Contains("[delete] if the app deletes", description, StringComparison.Ordinal);
        Assert.Contains("v8 to v9 upgrade", description, StringComparison.Ordinal);
    }

    [Fact]
    public void States_Its_Own_Precondition_Because_Any_403_Reaches_It()
    {
        // Hook and service-task commands wrap exceptions from app-implemented handlers, so a 403 from
        // a platform call an app's own handler makes lands here too. The message may not assert that
        // the app's policy is at fault when it cannot know that.
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(new ApplicationMetadata("ttd/myapp"));

        Assert.Contains("If it was one the app makes on its own behalf", description, StringComparison.Ordinal);
        Assert.Contains("your own handler makes can be unrelated", description, StringComparison.Ordinal);
    }

    [Fact]
    public void Says_That_A_Temporary_Authorization_Failure_Gives_The_Same_403()
    {
        // Storage answers 403 both for a missing grant and when Altinn Authorization fails to decide, so a
        // reader who finds the policy in order must not be left looking for a gap that is not there.
        string description = ServiceOwnerAuthorizationDiagnostics.Describe(new ApplicationMetadata("ttd/myapp"));

        Assert.Contains("temporary failure in Altinn Authorization", description, StringComparison.Ordinal);
    }

    [Fact]
    public void A_Failed_Result_Flags_The_Denial_Without_Changing_The_Retry_Classification()
    {
        var result = FailedWorkflowEngineCommandResult.Retryable(Platform(HttpStatusCode.Forbidden));

        Assert.True(result.ServiceOwnerAuthorizationDenied);
        // The diagnosis is an explanation, not a reclassification: a 403 stays retryable so the
        // engine's behaviour and the caller's response are unchanged.
        Assert.False(result.NonRetryable);
    }

    [Fact]
    public void A_Failed_Result_From_Any_Other_Exception_Is_Not_Flagged()
    {
        Assert.False(
            FailedWorkflowEngineCommandResult.Retryable(new TimeoutException()).ServiceOwnerAuthorizationDenied
        );
        Assert.False(
            FailedWorkflowEngineCommandResult.Retryable("something went wrong").ServiceOwnerAuthorizationDenied
        );
        Assert.False(FailedWorkflowEngineCommandResult.Permanent("invalid payload").ServiceOwnerAuthorizationDenied);
    }
}
