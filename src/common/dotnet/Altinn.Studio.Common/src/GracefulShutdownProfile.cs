using System;

namespace Altinn.Studio.Common;

/// <summary>
/// Defines the application-controlled portion of a graceful shutdown profile.
/// </summary>
/// <remarks>
/// The endpoint drain delay and application shutdown timeout, plus an intentional safety buffer,
/// must fit within the workload's Kubernetes <c>terminationGracePeriodSeconds</c>.
/// </remarks>
public sealed record GracefulShutdownProfile
{
    /// <summary>
    /// Creates a graceful shutdown profile.
    /// </summary>
    /// <param name="endpointDrainDelay">
    /// Time allowed for endpoint removal to propagate before application shutdown starts.
    /// </param>
    /// <param name="applicationShutdownTimeout">
    /// Maximum time the host may spend completing application shutdown after the drain delay.
    /// </param>
    public GracefulShutdownProfile(TimeSpan endpointDrainDelay, TimeSpan applicationShutdownTimeout)
    {
        if (endpointDrainDelay < TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(
                nameof(endpointDrainDelay),
                "The endpoint drain delay cannot be negative."
            );
        if (applicationShutdownTimeout <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(
                nameof(applicationShutdownTimeout),
                "The application shutdown timeout must be greater than zero."
            );

        EndpointDrainDelay = endpointDrainDelay;
        ApplicationShutdownTimeout = applicationShutdownTimeout;
    }

    /// <summary>
    /// Gets the time allowed for endpoint removal to propagate before application shutdown starts.
    /// </summary>
    public TimeSpan EndpointDrainDelay { get; }

    /// <summary>
    /// Gets the maximum time the host may spend completing application shutdown.
    /// </summary>
    public TimeSpan ApplicationShutdownTimeout { get; }
}
