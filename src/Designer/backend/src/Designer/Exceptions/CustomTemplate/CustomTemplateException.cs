using System;
using System.Collections.Generic;
using NJsonSchema.Validation;

namespace Altinn.Studio.Designer.Exceptions.CustomTemplate;

public enum CustomTemplateErrorCode
{
    NotFound,
    DeserializationFailed,
    ValidationFailed
}

public class CustomTemplateException : Exception
{
    public CustomTemplateErrorCode Code { get; init; }

    public string? Detail { get; init; }

    public CustomTemplateException(CustomTemplateErrorCode code, string message, string? detail = null, Exception? innerException = null)
        : base(message, innerException)
    {
        Code = code;
        Detail = detail;
    }

    public static CustomTemplateException NotFound(string message) =>
        new(CustomTemplateErrorCode.NotFound, message);

    public static CustomTemplateException DeserializationFailed(string message, string? detail = null, Exception? innerException = null) =>
        new(CustomTemplateErrorCode.DeserializationFailed, message, detail, innerException);

    public static CustomTemplateException ValidationFailed(string message, ICollection<ValidationError> errors) =>
        new(CustomTemplateErrorCode.ValidationFailed, message, string.Join("; ", errors));
}
