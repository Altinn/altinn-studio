using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class PagesDto
{
    [JsonPropertyName("pages")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public List<PageDto> Pages { get; set; }

    [JsonPropertyName("groups")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public List<GroupDto> Groups { get; set; }

    public PagesDto() { }

    public PagesDto(LayoutSettings layoutSettings)
    {
        if (layoutSettings.Pages.Order != null)
        {
            Pages = [.. layoutSettings.Pages.Order.Select(pageId => new PageDto { Id = pageId })];
        }
        if (layoutSettings.Pages.Groups != null)
        {
            Groups =
            [
                .. layoutSettings.Pages.Groups.Select(group => new GroupDto
                {
                    Name = group.Name,
                    Pages = [.. group.Order.Select(pageId => new PageDto { Id = pageId })],
                }),
            ];
        }
    }
}
