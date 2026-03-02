using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record ApiKeyResponse(
    long Id,
    string DisplayName,
    DateTimeOffset ExpiresAt,
    bool Revoked,
    DateTimeOffset CreatedAt);
