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

    public static PagesDto From(LayoutSettings layoutSettings)
    {
        PagesDto pagesDto = new();
        if (layoutSettings.Pages.Order != null)
        {
            pagesDto.Pages =
            [
                .. layoutSettings.Pages.Order.Select(pageId => new PageDto { Id = pageId }),
            ];
        }
        if (layoutSettings.Pages.Groups != null)
        {
            pagesDto.Groups =
            [
                .. layoutSettings.Pages.Groups.Select(group => new GroupDto
                {
                    Name = group.Name,
                    Pages = [.. group.Order.Select(pageId => new PageDto { Id = pageId })],
                }),
            ];
        }
        return pagesDto;
    }

    public Pages ToBusiness()
    {
        Pages pages = new()
        {
            Order = Pages?.Select(page => page.Id).ToList(),
            Groups = Groups
                ?.Select(group => new Group
                {
                    Name = group.Name,
                    Order = [.. group.Pages.Select(page => page.Id)],
                })
                .ToList(),
        };
        return pages;
    }
}
