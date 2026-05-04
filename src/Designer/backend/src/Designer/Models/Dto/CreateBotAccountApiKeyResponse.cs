using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record CreateBotAccountApiKeyResponse(
    long Id,
    string Key,
    string Name,
    DateTimeOffset ExpiresAt,
    string CreatedByUsername
);
