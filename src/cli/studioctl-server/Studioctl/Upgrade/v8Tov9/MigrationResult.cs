namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Everything a migration job has to say. Any to-do message means a manual follow-up is required to finish the migration successfully; warnings are just informational.
/// </summary>
internal sealed record MigrationResult(IReadOnlyList<UpgradeMessage> Messages)
{
    /// <summary>A clean run: nothing to report and nothing left for a human.</summary>
    public MigrationResult()
        : this([]) { }

    /// <summary>Whether any message is work left for a human.</summary>
    public bool RequiresManualFollowUp => Messages.Any(static message => message.Status == UpgradeMessageStatus.Todo);

    /// <summary>The warning texts</summary>
    public IReadOnlyList<string> Warnings => TextsOfStatus(UpgradeMessageStatus.Warning);

    /// <summary>The to-do texts</summary>
    public IReadOnlyList<string> Todos => TextsOfStatus(UpgradeMessageStatus.Todo);

    private IReadOnlyList<string> TextsOfStatus(UpgradeMessageStatus status) =>
        [.. Messages.Where(message => message.Status == status).Select(static message => message.Text)];
}

/// <summary>Utility functions for building a migrator's message list.</summary>
internal static class UpgradeMessageListExtensions
{
    public static void Warn(this List<UpgradeMessage> messages, string text) =>
        messages.Add(new UpgradeMessage(text, UpgradeMessageStatus.Warning));

    public static void Todo(this List<UpgradeMessage> messages, string text) =>
        messages.Add(new UpgradeMessage(text, UpgradeMessageStatus.Todo));

    public static void WarnRange(this List<UpgradeMessage> messages, IEnumerable<string> texts)
    {
        foreach (var text in texts)
        {
            messages.Warn(text);
        }
    }
}
