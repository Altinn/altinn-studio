using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class Pages
{
    [JsonPropertyName("pages")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public List<Page> pages { get; set; }

    [JsonPropertyName("groups")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public List<Group> groups { get; set; }

    public Pages() { }

    public Pages(LayoutSettings layoutSettings)
    {
        if (layoutSettings.Pages.Order != null)
        {
            pages = [.. layoutSettings.Pages.Order.Select(pageId => new Page { id = pageId })];
        }
        if (layoutSettings.Pages.Groups != null)
        {
            groups =
            [
                .. layoutSettings.Pages.Groups.Select(group => new Designer.Models.Dto.Group
                {
                    name = group.Name,
                    pages = [.. group.Order.Select(pageId => new Page { id = pageId })],
                }),
            ];
        }
    }
}
