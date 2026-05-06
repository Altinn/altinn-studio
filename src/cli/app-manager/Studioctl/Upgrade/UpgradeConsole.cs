using System.Threading;

namespace Altinn.Studio.Cli.Upgrade;

internal static class UpgradeConsole
{
    private static readonly AsyncLocal<Writers?> Current = new();

    public static TextWriter Out =>
        Current.Value?.StandardOutput
        ?? throw new InvalidOperationException("Upgrade output writer is not configured.");

    public static TextWriter Error =>
        Current.Value?.StandardError ?? throw new InvalidOperationException("Upgrade error writer is not configured.");

    public static IDisposable Use(TextWriter output, TextWriter error)
    {
        var previous = Current.Value;
        Current.Value = new Writers(output, error);
        return new Scope(previous);
    }

    public static void WriteLine(string message)
    {
        Out.WriteLine(message);
    }

    public static void WriteErrorLine(string message)
    {
        Error.WriteLine(message);
    }

    private sealed record Writers(TextWriter StandardOutput, TextWriter StandardError);

    private sealed class Scope(Writers? previous) : IDisposable
    {
        public void Dispose()
        {
            Current.Value = previous;
        }
    }
}
