using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.Models.Dto;

public class ProcessDefinitionDto
{
    public IFormFile Content { get; set; }

    public ProcessDefinitionMetadata ProcessDefinitionMetadata { get; set; }
}
