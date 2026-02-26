#nullable disable
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public class DataTypesChange
{
    public List<string> NewDataTypes { get; set; }
    public string ConnectedTaskId { get; set; }
}
