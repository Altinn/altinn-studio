#nullable enable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.SharedContent;

public record VersionsIndex(string Latest, List<string> Versions);
