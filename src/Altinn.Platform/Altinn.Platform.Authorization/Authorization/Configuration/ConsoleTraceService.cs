using System;
using Yuniql.Extensibility;

namespace Altinn.Platform.Authorization.Configuration
{
    /// <summary>
    /// Copied from sample project.
    /// </summary>
    public class ConsoleTraceService : ITraceService
    {
        /// <summary>
        /// Debug enabled 
        /// </summary>
        public bool IsDebugEnabled { get; set; } = false;

        /// <summary>
        /// Info
        /// </summary>      
        public void Info(string message, object payload = null)
        {
            var traceMessage = $"INF   {DateTime.UtcNow.ToString("o")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }

        /// <summary>
        /// Error
        /// </summary>
        public void Error(string message, object payload = null)
        {
            var traceMessage = $"ERR   {DateTime.UtcNow.ToString("o")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }

        /// <summary>
        /// Debug
        /// </summary>
        public void Debug(string message, object payload = null)
        {
            if (IsDebugEnabled)
            {
                var traceMessage = $"DBG   {DateTime.UtcNow.ToString("o")}   {message}{Environment.NewLine}";
                Console.Write(traceMessage);
            }
        }

        /// <summary>
        /// Success
        /// </summary>
        public void Success(string message, object payload = null)
        {
            var traceMessage = $"INF   {DateTime.UtcNow.ToString("u")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }

        /// <summary>
        /// Warn
        /// </summary>
        public void Warn(string message, object payload = null)
        {
            var traceMessage = $"WRN   {DateTime.UtcNow.ToString("o")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }
    }
}
