using System;
using Microsoft.Extensions.Logging;

namespace NUnit.Framework
{
    /// <summary>
    /// TestLogger
    /// </summary>
    public static class TestLogger
    {
        /// <summary>
        /// Create
        /// </summary>
        /// <typeparam name="T">typeparam</typeparam>
        /// <returns>ILogger</returns>
        public static ILogger<T> Create<T>()
        {
            var logger = new NUnitLogger<T>();
            return logger;
        }

        /// <summary>
        /// NUnitLogger
        /// </summary>
        /// <typeparam name="T">typeparam</typeparam>
        public class NUnitLogger<T> : ILogger<T>, IDisposable
        {
            private readonly Action<string> output = Console.WriteLine;

            /// <summary>
            /// Dispose
            /// </summary>
            public void Dispose()
            {
            }

            /// <summary>
            /// Log
            /// </summary>
            /// <typeparam name="TState">TState</typeparam>
            /// <param name="logLevel">logLevel</param>
            /// <param name="eventId">eventId</param>
            /// <param name="state">state</param>
            /// <param name="exception">exception</param>
            /// <param name="formatter">formatter</param>
            public void Log<TState>(
                LogLevel logLevel,
                EventId eventId,
                TState state,
                Exception exception,
                Func<TState, Exception, string> formatter) => output(formatter(state, exception));

            /// <summary>
            /// IsEnabled
            /// </summary>
            /// <param name="logLevel">logLevel</param>
            /// <returns>true if enabled</returns>
            public bool IsEnabled(LogLevel logLevel) => true;

            /// <summary>
            /// BeginScope
            /// </summary>
            /// <typeparam name="TState">TState</typeparam>
            /// <param name="state">state</param>
            /// <returns>IDisposable</returns>
            public IDisposable BeginScope<TState>(TState state) => this;
        }
    }
}
