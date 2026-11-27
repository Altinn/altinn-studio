using System.Net.Sockets;
using System.Security.Authentication;

namespace Altinn.Studio.Fleet;

/// <summary>Thrown when a sync or another operation on the store cannot complete.</summary>
public sealed class FleetException : Exception
{
    /// <summary>Creates an exception.</summary>
    public FleetException() { }

    /// <summary>Creates an exception with a message.</summary>
    public FleetException(string message)
        : base(message) { }

    /// <summary>Creates an exception with a message and its cause.</summary>
    public FleetException(string message, Exception innerException)
        : base(message, innerException) { }

    // A short reason for a failed request, such as "name not found" rather than a stack of wrapped exceptions.
    internal static string Describe(Exception exception)
    {
        for (Exception? current = exception; current is not null; current = current.InnerException)
        {
            switch (current)
            {
                case SocketException socket:
                    return socket.SocketErrorCode switch
                    {
                        SocketError.HostNotFound or SocketError.NoData => "host not found",
                        SocketError.ConnectionRefused => "connection refused",
                        SocketError.TimedOut => "connection timed out",
                        _ => socket.Message,
                    };
                case AuthenticationException:
                    return "TLS handshake failed";
            }
        }

        return exception.Message;
    }
}
