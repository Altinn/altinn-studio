using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record ApiKeyResponse(long Id, string Name, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt);
