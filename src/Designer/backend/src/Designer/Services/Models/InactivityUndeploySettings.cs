namespace Altinn.Studio.Designer.Services.Models;

/// <summary>
/// Whether an org or app is undeployed after a period without activity, and the length of that period.
/// </summary>
public sealed record InactivityUndeploySettings(bool UndeployOnInactivity, int InactivityPeriodDays);
