using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.Logging;
using Moq;

namespace Altinn.Platform.Events.Tests.Helpers
{
    /// <summary>
    /// dge
    /// </summary>
    public static class ILoggerMockExtension
    {
        /// <summary>
        /// egweg
        /// </summary>
        /// <typeparam name="T"></typeparam>
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
