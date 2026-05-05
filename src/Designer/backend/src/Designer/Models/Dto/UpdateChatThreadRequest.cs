using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public record UpdateChatThreadRequest([MaxLength(100)] string Title);
