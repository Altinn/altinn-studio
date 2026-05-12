using System.ComponentModel.DataAnnotations;

namespace Altinn.Studio.Designer.Models.Dto;

public record ChatFeedbackRequest([MaxLength(64)] string TraceId, bool ThumbsUp, [MaxLength(10000)] string? Comment);
