using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// Builds a <see cref="MailboxDeliveryEnvelope"/> over an in-memory app-code, for tests that need a real one —
/// either because they exercise the envelope itself, or because
/// <see cref="Altinn.App.Core.Internal.WorkflowEngine.Commands.ExecuteServiceTask"/> requires one.
/// </summary>
internal static class TestMailboxDeliveryEnvelope
{
    internal const string DefaultSecretId = "test-code";
    internal const string DefaultCode = "test-callback-code-long-enough-for-hmac";

    /// <summary>An envelope signing and verifying with a single non-expired code — the ordinary case.</summary>
    internal static MailboxDeliveryEnvelope Create(string secretId = DefaultSecretId, string code = DefaultCode) =>
        new(CreateSigner(secretId, code));

    /// <summary>
    /// An envelope whose app-code is unavailable — the mounting/rotation gap in which the app can sign nothing.
    /// </summary>
    internal static MailboxDeliveryEnvelope CreateWithoutSecret()
    {
        var secretProvider = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
        secretProvider
            .Setup(x => x.GetSigningSecret())
            .Throws(new WorkflowCallbackSecretNotFoundException("AppCodes:WorkflowEngineCallback is not configured."));

        return new MailboxDeliveryEnvelope(new WorkflowStateSigner(secretProvider.Object));
    }

    /// <summary>
    /// The signer behind <see cref="Create"/>, for tests that need the <see cref="WorkflowStateSigner"/> directly.
    /// </summary>
    internal static WorkflowStateSigner CreateSigner(string secretId = DefaultSecretId, string code = DefaultCode)
    {
        AppCode appCode = new()
        {
            Id = secretId,
            Code = code,
            IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(30),
        };

        var secretProvider = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
        secretProvider.Setup(x => x.GetSigningSecret()).Returns(appCode);
        secretProvider.Setup(x => x.GetValidationSecrets()).Returns([appCode]);

        return new WorkflowStateSigner(secretProvider.Object);
    }
}
