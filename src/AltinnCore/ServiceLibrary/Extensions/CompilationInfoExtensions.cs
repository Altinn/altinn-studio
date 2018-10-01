using System;

namespace AltinnCore.ServiceLibrary.Extensions
{
    /// <summary>
    /// The compilation info extensions.
    /// </summary>
    public static class CompilationInfoExtensions
    {
        /// <summary> Check if CompilationInfo has severity error. </summary>
        /// <param name="c"> The CompilationInfo. </param>
        /// <returns> The <see cref="bool"/>. </returns>
        public static bool IsError(this CompilationInfo c)
        {
            return "Error".Equals(c?.Severity, StringComparison.CurrentCultureIgnoreCase);
        }

        /// <summary> Check if CompilationInfo has severity warning. </summary>
        /// <param name="c"> The CompilationInfo. </param>
        /// <returns> The <see cref="bool"/>. </returns>
        public static bool IsWarning(this CompilationInfo c)
        {
            return "Warning".Equals(c?.Severity, StringComparison.CurrentCultureIgnoreCase);
        }
    }
}
