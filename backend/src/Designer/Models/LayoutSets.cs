using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

public class LayoutSets
{
    public List<LayoutSetConfig> Sets { get; set; }
}

public class LayoutSetConfig
{
    public string Id { get; set; }
    public string DataType { get; set; }
    public List<string> Tasks { get; set; }
}
