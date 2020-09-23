using System;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.Platform.Events.Tests.Helpers
{
    /// <summary>
    /// Extension class for Mock(ILogger(T))
    /// </summary>
    public static class ILoggerMockExtension
    {
        /// <summary>
        /// Verifies that LogCritical has been called.
        /// </summary>
        /// <typeparam name="T">The type of the ILogger/typeparam>
        /// <param name="logger">The logger</param>
        /// <returns></returns>
        public static Mock<ILogger<T>> VerifyCriticalWasCalled<T>(this Mock<ILogger<T>> logger)
        {
            logger.Verify(
                x => x.Log(
                    It.Is<LogLevel>(l => l == LogLevel.Critical),
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => true),
                    It.IsAny<Exception>(),
                    It.Is<Func<It.IsAnyType, Exception, string>>((v, t) => true)));

            return logger;
        }
    }
}
