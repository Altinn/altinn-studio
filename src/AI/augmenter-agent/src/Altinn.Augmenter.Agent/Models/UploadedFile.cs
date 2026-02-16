namespace Altinn.Augmenter.Agent.Models;

public sealed record UploadedFile(string Name, string ContentType, byte[] Data);
