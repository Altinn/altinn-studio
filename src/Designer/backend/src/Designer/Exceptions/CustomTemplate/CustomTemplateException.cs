using System;
using System.Collections.Generic;
using NJsonSchema.Validation;

namespace Altinn.Studio.Designer.Exceptions.CustomTemplate;

public class CustomTemplateException : Exception
{
    public string Code { get; init; } = string.Empty;
    public string? Detail { get; init; }

    public CustomTemplateException(string code, string message, string? detail = null, Exception? innerException = null)
        : base(message, innerException)
    {
        Code = code;
        Detail = detail;
    }

    public static CustomTemplateException NotFound(string message) =>
        new("NotFound", message);

    public static CustomTemplateException DeserializationFailed(string message, string? detail = null, Exception? innerException = null) =>
        new("DeserializationFailed", message, detail, innerException);

    public static CustomTemplateException ValidationFailed(string message, ICollection<ValidationError> errors) =>
        new("ValidationFailed", message, string.Join("; ", errors));
}
