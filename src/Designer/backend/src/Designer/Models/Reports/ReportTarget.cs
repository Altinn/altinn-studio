namespace Altinn.Studio.Designer.Models.Reports;

/// <summary>
/// An org and environment that has at least one active contact point subscribed to a report frequency.
/// </summary>
public sealed record ReportTarget(string Org, string Environment);
