namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Turns file-system failures during an upgrade into more user friendly messages.
/// </summary>
internal static class FileAccessDiagnostics
{
    internal const string Hint =
        "Make sure you have write access to the app folder, and that no other program (for example Visual Studio, "
        + "VS Code or a running app) has the files open. Close it, then run the upgrade again.";

    /// <summary>
    /// Returns the exception message, with <see cref="Hint"/> appended when the failure looks like a
    /// permission or file-locking problem the user can act on.
    /// </summary>
    internal static string Describe(Exception exception) =>
        IsAccessFailure(exception) ? $"{exception.Message} {Hint}" : exception.Message;

    private static bool IsAccessFailure(Exception exception) =>
        exception switch
        {
            UnauthorizedAccessException => true,
            FileNotFoundException
            or DirectoryNotFoundException
            or DriveNotFoundException
            or PathTooLongException
            or EndOfStreamException => false,
            IOException => true,
            _ => false,
        };
}
