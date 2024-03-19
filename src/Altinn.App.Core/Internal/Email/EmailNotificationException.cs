namespace Altinn.App.Core.Internal.Email;

/// <summary>
/// Class representing an exception throw when an email notification could not be sent.
/// </summary>
public sealed class EmailNotificationException : Exception
{
    /// <summary>
    /// Creates a new Exception of <see cref="EmailNotificationException"/>
    /// Intended to be used when the email notification fails.
    /// </summary>
    public EmailNotificationException()
    {
    }

    /// <summary>
    /// Creates a new Exception of <see cref="EmailNotificationException"/>
    /// Intended to be used when the email notification fails.
    /// </summary>
    public EmailNotificationException(string? message) : base(message)
    {
    }

    /// <summary>
    /// Creates a new Exception of <see cref="EmailNotificationException"/>
    /// Intended to be used when the email notification fails.
    /// </summary>
    public EmailNotificationException(string? message, Exception? innerException) : base(message, innerException)
    {
    }
}

