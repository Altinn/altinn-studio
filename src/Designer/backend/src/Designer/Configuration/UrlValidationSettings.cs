#nullable disable
using System.Collections.Generic;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class UrlValidationSettings : ISettingsMarker
{
    public List<string> AllowedList { get; set; } = [];
    public List<string> BlockedList { get; set; } = [];
}
