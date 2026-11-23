namespace Altinn.Studio.Designer.Models.Dto;

public record FrontendEnvironmentResponse(
    string? AiConnectionString,
    string? PostHogApiKey,
    string? PostHogApiHost,
    string? AccountLinkUrl
);
