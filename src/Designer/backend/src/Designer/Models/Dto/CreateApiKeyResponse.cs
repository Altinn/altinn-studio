using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record CreateApiKeyResponse(
    long Id,
    string Key,
    string DisplayName,
    DateTimeOffset ExpiresAt);
