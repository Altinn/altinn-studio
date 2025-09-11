#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class UpdateCodeListRequest
{
    [JsonPropertyName("codeListWrappers")]
    public required List<CodeListWrapper> CodeListWrappers { get; set; }
    [JsonPropertyName("commitMessage")]
    public string? CommitMessage { get; set; }
}
