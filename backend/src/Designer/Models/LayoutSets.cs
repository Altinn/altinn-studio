using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

public class LayoutSets
{
    public List<LayoutSetConfig> sets { get; set; }
}

public class LayoutSetConfig
{
    public string id { get; set; }
    public string dataTypes { get; set; }
    public List<string> tasks { get; set; }
}
