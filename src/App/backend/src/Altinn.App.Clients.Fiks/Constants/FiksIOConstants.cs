namespace Altinn.App.Clients.Fiks.Constants;

/// <summary>
/// Constants related to the configuration and operation of the Fiks IO client.
/// </summary>
internal static class FiksIOConstants
{
    internal static class Stubs
    {
        public const string InvalidRequest = "ugyldigforespoersel";
        public const string ServerError = "serverfeil";
        public const string NotFound = "ikkefunnet";
        public const string ReceiptSuffix = ".kvittering";
        public const string AcknowledgementSuffix = ".mottatt";
    }

    internal static bool IsErrorType(string messageType) =>
        messageType.Contains(Stubs.InvalidRequest, StringComparison.OrdinalIgnoreCase)
        || messageType.Contains(Stubs.ServerError, StringComparison.OrdinalIgnoreCase)
        || messageType.Contains(Stubs.NotFound, StringComparison.OrdinalIgnoreCase);

    internal static bool IsReceiptType(string messageType) =>
        messageType.Contains(Stubs.ReceiptSuffix, StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Whether the message type is an intermediate acknowledgement (<c>*.mottatt</c>) — the recipient
    /// confirming that it has the request, which is not yet an answer to it.
    /// </summary>
    internal static bool IsAcknowledgementType(string messageType) =>
        messageType.Contains(Stubs.AcknowledgementSuffix, StringComparison.OrdinalIgnoreCase);
}
