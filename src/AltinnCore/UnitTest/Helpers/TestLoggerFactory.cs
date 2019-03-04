using System;
using Microsoft.Extensions.Logging;

namespace NUnit.Framework
{
    /// <summary>
    /// TestLoggerFactory
    /// </summary>
    public class TestLoggerFactory : ILoggerFactory
    {
        /// <inheritdoc/>
        public void AddProvider(ILoggerProvider provider)
        {
        }

        /// <inheritdoc/>
        public ILogger CreateLogger(string categoryName)
        {
            return TestLogger.Create<ILogger>();
        }

        /// <summary>
        /// Create a test logger
        /// </summary>
        /// <typeparam name="T">Type to log</typeparam>
        /// <returns>The logger</returns>
        public static ILogger<T> CreateLogger<T>()
        {
            return TestLogger.Create<T>();
        }

        /// <inheritdoc/>
        public void Dispose()
        {
        }
    }
}
