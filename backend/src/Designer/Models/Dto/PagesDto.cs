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

    [JsonPropertyName("hideCloseButton")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? HideCloseButton { get; set; }

    [JsonPropertyName("showLanguageSelector")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ShowLanguageSelector { get; set; }

    [JsonPropertyName("showExpandWidthButton")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ShowExpandWidthButton { get; set; }

    [JsonPropertyName("expandedWidth")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ExpandedWidth { get; set; }

    [JsonPropertyName("showProgress")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool? ShowProgress { get; set; }

    [JsonPropertyName("autoSaveBehaviour")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public AutoSaveBehaviourType? AutoSaveBehaviour { get; set; }

    [JsonPropertyName("taskNavigation")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<TaskNavigationGroup>? TaskNavigation { get; set; }

    [JsonPropertyName("excludeFromPdf")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? ExcludeFromPdf { get; set; }

    [JsonPropertyName("pdfLayoutName")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? PdfLayoutName { get; set; }

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
        pagesDto.HideCloseButton = layoutSettings.Pages?.HideCloseButton;
        pagesDto.ShowLanguageSelector = layoutSettings.Pages?.ShowLanguageSelector;
        pagesDto.ShowExpandWidthButton = layoutSettings.Pages?.ShowExpandWidthButton;
        pagesDto.ExpandedWidth = layoutSettings.Pages?.ExpandedWidth;
        pagesDto.ShowProgress = layoutSettings.Pages?.ShowProgress;
        pagesDto.AutoSaveBehaviour = layoutSettings.Pages?.AutoSaveBehaviour;
        pagesDto.TaskNavigation = layoutSettings.Pages?.TaskNavigation;
        pagesDto.ExcludeFromPdf = layoutSettings.Pages?.ExcludeFromPdf;
        pagesDto.PdfLayoutName = layoutSettings.Pages?.PdfLayoutName;
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
        pages.HideCloseButton = HideCloseButton;
        pages.ShowLanguageSelector = ShowLanguageSelector;
        pages.ShowExpandWidthButton = ShowExpandWidthButton;
        pages.ExpandedWidth = ExpandedWidth;
        pages.ShowProgress = ShowProgress;
        pages.AutoSaveBehaviour = AutoSaveBehaviour;
        pages.TaskNavigation = TaskNavigation;
        pages.ExcludeFromPdf = ExcludeFromPdf;
        pages.PdfLayoutName = PdfLayoutName;
        return pages;
    }
}
