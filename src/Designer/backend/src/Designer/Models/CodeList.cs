using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models;

public class CodeList
{
    public string SourceName { get; set; }
    public List<Code> Codes { get; set; }
    public string Version { get; set; }
}

