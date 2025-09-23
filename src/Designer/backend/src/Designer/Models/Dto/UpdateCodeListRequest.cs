#nullable enable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public sealed record UpdateCodeListRequest(List<CodeListWrapper> CodeListWrappers, string CommitMessage = "");
