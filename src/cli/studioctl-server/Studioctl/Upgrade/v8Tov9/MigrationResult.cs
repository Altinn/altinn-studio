namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>What a migrator's message asks of the reader.</summary>
internal enum MigrationMessageKind
{
    /// <summary>Worth knowing about, but the migration did everything it safely could.</summary>
    Warning,

    /// <summary>Work a human must finish by hand before the app is v9-ready.</summary>
    Todo,
}

/// <summary>One thing a migrator has to say, and whether it is work left for a human.</summary>
internal readonly record struct MigrationMessage(string Text, MigrationMessageKind Kind);

/// <summary>
/// Everything a migration job has to say. Any to-do message means a manual follow-up is required to finish the migration successfully; warnings are just informational.
/// </summary>
internal sealed record MigrationResult(IReadOnlyList<MigrationMessage> Messages)
{
    /// <summary>A clean run: nothing to report and nothing left for a human.</summary>
    public MigrationResult()
        : this([]) { }

    /// <summary>Whether any message is work left for a human.</summary>
    public bool RequiresManualFollowUp => Messages.Any(static message => message.Kind == MigrationMessageKind.Todo);

    /// <summary>The warning texts</summary>
    public IReadOnlyList<string> Warnings => TextsOfKind(MigrationMessageKind.Warning);

    /// <summary>The to-do texts</summary>
    public IReadOnlyList<string> Todos => TextsOfKind(MigrationMessageKind.Todo);

    private IReadOnlyList<string> TextsOfKind(MigrationMessageKind kind) =>
        [.. Messages.Where(message => message.Kind == kind).Select(static message => message.Text)];
}

/// <summary>Utility functions for building a migrator's message list.</summary>
internal static class MigrationMessageListExtensions
{
    public static void Warn(this List<MigrationMessage> messages, string text) =>
        messages.Add(new MigrationMessage(text, MigrationMessageKind.Warning));

    public static void Todo(this List<MigrationMessage> messages, string text) =>
        messages.Add(new MigrationMessage(text, MigrationMessageKind.Todo));

    public static void WarnRange(this List<MigrationMessage> messages, IEnumerable<string> texts)
    {
        foreach (var text in texts)
        {
            messages.Warn(text);
        }
    }
}
