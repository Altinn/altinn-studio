using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record PersonalAccessTokenResponse(long Id, string Name, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt);
