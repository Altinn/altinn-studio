namespace Altinn.App.Clients.Fiks.Constants;

/// <summary>
/// Constants related to the configuration and operation of the Fiks IO client.
/// </summary>
public static class FiksIOConstants
{
    /// <summary>
    /// The ID for the user-configurable resilience pipeline (retry strategy).
    /// </summary>
    public const string UserDefinedResiliencePipelineId = "FiksIOResiliencePipeline";

    internal const string DefaultResiliencePipelineId = "DefaultFiksIOResiliencePipeline";
    internal const string MessageRequestPropertyKey = "FiksIOMessageRequest";

    internal static class Stubs
    {
        public const string InvalidRequest = "ugyldigforespoersel";
        public const string ServerError = "serverfeil";
        public const string NotFound = "ikkefunnet";
        public const string ReceiptSuffix = ".kvittering";
    }

    internal static bool IsErrorType(string messageType) =>
        messageType.Contains(Stubs.InvalidRequest, StringComparison.OrdinalIgnoreCase)
        || messageType.Contains(Stubs.ServerError, StringComparison.OrdinalIgnoreCase)
        || messageType.Contains(Stubs.NotFound, StringComparison.OrdinalIgnoreCase);

    internal static bool IsReceiptType(string messageType) =>
        messageType.Contains(Stubs.ReceiptSuffix, StringComparison.OrdinalIgnoreCase);
}
