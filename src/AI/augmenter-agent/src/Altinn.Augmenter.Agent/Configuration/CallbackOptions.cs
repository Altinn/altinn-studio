namespace Altinn.Augmenter.Agent.Configuration;

public sealed class CallbackOptions
{
    public const string SectionName = "Callback";
    public List<string> AllowedPatterns { get; set; } = [];
    public int TimeoutSeconds { get; set; } = 30;
}
