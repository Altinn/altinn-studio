namespace Altinn.App.Core.Internal.AccessManagement.Exceptions;

internal sealed class AccessManagementArgumentException : AccessManagementException
{
    public AccessManagementArgumentException() { }

    public AccessManagementArgumentException(string? message)
        : base(message) { }

    public AccessManagementArgumentException(string? message, Exception? innerException)
        : base(message, innerException) { }
}
