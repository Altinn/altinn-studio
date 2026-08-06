namespace Altinn.Studio.Cli.Upgrade;

/// <summary>
/// Turns file-system failures during an upgrade into more user friendly messages.
/// </summary>
internal static class FileAccessDiagnostics
{
    internal const string Hint =
        "Make sure you have write access to the app folder, and that no other program (for example Visual Studio, "
        + "VS Code or a running app) has the files open. Close it, then run the upgrade again.";

    internal static string Describe(Exception exception) =>
        exception is IOException or UnauthorizedAccessException ? $"{exception.Message} {Hint}" : exception.Message;
}
