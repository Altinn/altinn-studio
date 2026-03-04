using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record CreatePersonalAccessTokenResponse(
    long Id,
    string Key,
    string DisplayName,
    DateTimeOffset ExpiresAt);
