using Altinn.Studio.Designer.Enums;

namespace Altinn.Studio.Designer.Models;

public class ExternalContentLibraryResource
{
    public required string Source { get; set; }
    public required LibraryContentType Type { get; set; }
    public required string Id { get; set; }
}
