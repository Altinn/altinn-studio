#nullable disable
using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models.Dto;

public class LibraryContentReference
{
    public required string Id { get; set; }
    public required LibraryContentType Type { get; set; }
    public required string Source { get; set; }
}
