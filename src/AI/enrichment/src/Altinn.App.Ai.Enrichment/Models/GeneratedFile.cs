namespace Altinn.App.Ai.Enrichment.Models;

/// <summary>A file produced by an enrichment step, ready to be stored as an instance data element.</summary>
public sealed record GeneratedFile(string Name, string ContentType, byte[] Data);
