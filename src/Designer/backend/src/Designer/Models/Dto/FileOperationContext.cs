#nullable enable

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record FileOperationContext(string Operation, string Path, string? Content = null, string? FromPath = null, string? Sha = null);
