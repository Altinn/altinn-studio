namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// An app scaffold as presented to the frontend when creating a new application.
/// </summary>
public sealed record AppTemplateResponse(string Id, string DisplayName, string Description)
{
    public static AppTemplateResponse FromAppTemplate(AppTemplate template) =>
        new(template.Id, template.DisplayName, template.Description);
}
