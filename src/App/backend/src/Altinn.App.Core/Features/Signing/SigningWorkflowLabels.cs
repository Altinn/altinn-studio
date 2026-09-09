namespace Altinn.App.Core.Features.Signing;

/// <summary>Identifies notification jobs without interpreting engine command payloads.</summary>
internal static class SigningWorkflowLabels
{
    internal const string SigningNotificationLabel = "signingNotification";
    internal const string SigningInitializationLabel = "signingInitialization";
    internal const string SigningSigneeLabel = "signingSignee";
    internal const string SigningTaskLabel = "signingTask";
}
