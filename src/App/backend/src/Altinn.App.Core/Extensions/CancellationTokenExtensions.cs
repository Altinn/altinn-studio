namespace Altinn.App.Core.Extensions;

internal static class CancellationTokenExtensions
{
    /// <summary>
    /// Creates a linked cancellation token source that will be canceled after the specified timeout or when the original token is canceled.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token to link with the timeout.</param>
    /// <param name="timeout">The timeout duration.</param>
    /// <returns>A CancellationTokenSource that must be disposed to clean up resources.</returns>
    /// <example>
    /// <code>
    /// using var cts = cancellationToken.WithTimeout(TimeSpan.FromSeconds(30));
    /// await SomeOperationAsync(cts.Token);
    /// </code>
    /// </example>
    public static CancellationTokenSource WithTimeout(this CancellationToken cancellationToken, TimeSpan timeout)
    {
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(timeout);
        return cts;
    }
}
