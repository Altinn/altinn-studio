using System;
using Yuniql.Extensibility;

namespace Altinn.Platform.Events.Configuration
{
    //TIP: You can implement custom ITraceService to capture the log and debug information during your migration run.
    //This us usefule if you wish to sink trace logs into your preferred provider ie. serilog, seq, or others.

    /// <summary>
    /// Copied fromsample project.
    /// </summary>
    public class ConsoleTraceService : ITraceService
    {
        /// <summary>
        /// Debug enabled prop
        /// </summary>
        public bool IsDebugEnabled { get; set; } = false;

        /// <summary>
        /// Prop
        /// </summary>      
        public void Info(string message, object payload = null)
        {
            var traceMessage = $"INF   {DateTime.UtcNow.ToString("o")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }

        /// <summary>
        /// Error prop
        /// </summary>
        public void Error(string message, object payload = null)
        {
            var traceMessage = $"ERR   {DateTime.UtcNow.ToString("o")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }

        /// <summary>
        /// Prop
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
        /// prop
        /// </summary>
        public void Success(string message, object payload = null)
        {
            var traceMessage = $"INF   {DateTime.UtcNow.ToString("u")}   {message}{Environment.NewLine}";
            Console.Write(traceMessage);
        }
    }
}
