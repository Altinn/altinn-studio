using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record PersonalAccessTokenResponse(
    long Id,
    string DisplayName,
    DateTimeOffset ExpiresAt,
    bool Revoked,
    DateTimeOffset CreatedAt
);
