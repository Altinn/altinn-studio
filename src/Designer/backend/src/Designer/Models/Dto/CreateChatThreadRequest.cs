using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public record CreateChatThreadRequest([MaxLength(100)] string Title);
