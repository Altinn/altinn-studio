namespace Altinn.Studio.Designer.Models.Dto;

public record AppSettingsUpsertRequest
{
    public bool UndeployOnInactivity { get; init; }
}
