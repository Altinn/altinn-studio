namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Identity for a person's identity like an author or committer
/// </summary>
public sealed record GiteaIdentity(string Name, string? Email = null);
