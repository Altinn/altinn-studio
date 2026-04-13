using System;
using System.Collections.Generic;

namespace Altinn.Studio.Designer.Models.Dto;

public record BotAccountResponse(
    Guid Id,
    string Username,
    string OrganizationName,
    bool Deactivated,
    DateTimeOffset Created,
    string? CreatedByUsername,
    List<string> DeployEnvironments,
    int ApiKeyCount
);
