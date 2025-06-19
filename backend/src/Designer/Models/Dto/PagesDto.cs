#nullable enable
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto;

public class PagesDto
{
    [JsonPropertyName("pages")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public List<PageDto>? Pages { get; set; }

    [JsonPropertyName("groups")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public List<GroupDto>? Groups { get; set; }

    public PagesDto() { }

    public static PagesDto From(LayoutSettings layoutSettings)
    {
        PagesDto pagesDto = layoutSettings.Pages switch
        {
            PagesWithOrder pagesWithOrder => new PagesDto
            {
                Pages = pagesWithOrder
                    .Order?.Select(pageId => new PageDto { Id = pageId })
                    .ToList(),
            },
            PagesWithGroups pagesWithGroups => new PagesDto
            {
                Groups = pagesWithGroups
                    .Groups?.Select(group => new GroupDto
                    {
                        Name = group.Name,
                        Pages = group.Order.Select(pageId => new PageDto { Id = pageId }).ToList(),
                        MarkWhenCompleted = group.MarkWhenCompleted,
                        Type = group.Type,
                    })
                    .ToList(),
            },
            _ => throw new NotSupportedException("Unsupported layout settings type"),
        };
        return pagesDto;
    }

    /// <exception cref="InvalidOperationException">
    /// Throws if the DTO would result in an invalid business object
    /// </exception>
    public Pages ToBusiness()
    {
        if (Pages != null && Groups != null)
        {
            throw new InvalidOperationException(
                "Cannot convert to business object: `Pages` and `Groups` are defined"
            );
        }
        Pages pages = this switch
        {
            { Pages: not null } => new PagesWithOrder
            {
                Order = Pages.Select(page => page.Id).ToList(),
            },
            { Groups: not null } => new PagesWithGroups
            {
                Groups = Groups
                    .Select(group => new Group
                    {
                        Name = group.Name,
                        Order = [.. group.Pages.Select(page => page.Id)],
                        MarkWhenCompleted = group.MarkWhenCompleted,
                        Type = group.Type,
                    })
                    .ToList(),
            },
            _ => throw new InvalidOperationException(
                "Cannot convert to business object: `Pages` and `Groups` are not defined"
            ),
        };
        return pages;
    }
}
