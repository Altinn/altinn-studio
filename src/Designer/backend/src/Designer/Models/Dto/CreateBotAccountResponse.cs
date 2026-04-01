using System;

namespace Altinn.Studio.Designer.Models.Dto;

public record CreateBotAccountResponse(Guid Id, string Username, string OrganizationName, DateTimeOffset Created);
