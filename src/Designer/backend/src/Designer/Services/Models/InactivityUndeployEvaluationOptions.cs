namespace Altinn.Studio.Designer.Services.Models;

public class InactivityUndeployEvaluationOptions
{
    public required string Org { get; init; }
    public string? App { get; init; }
    public string? Environment { get; init; }
    public int WindowDays { get; init; } = 7;
}
