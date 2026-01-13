using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public class CreateAppRequest
{
    public string Org { get; set; } = string.Empty;
    public string Repository { get; set; } = string.Empty;
    public List<CustomTemplateReference> Templates { get; set; } = [];
}
