using System;
using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Entity that holds information about code compilation
    /// </summary>
    public class CodeCompilationResult
    {
        /// <summary>
        /// Gets or sets the AssemblyName
        /// </summary>
        public string AssemblyName { get; set; }

        /// <summary>
        /// Gets or sets the List of compilation info
        /// </summary>
        public List<CompilationInfo> CompilationInfo { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether if compilation succeeded
        /// </summary>
        public bool Succeeded { get; set; }

        /// <summary>
        /// Gets or sets the number of warnings
        /// </summary>
        public int Warnings { get; set; }

        /// <summary>
        /// Gets or sets the number of errors
        /// </summary>
        public int Errors { get; set; }

        /// <summary>
        /// Gets or sets the Time used for compilation
        /// </summary>
        public TimeSpan TimeUsed { get; set; }

        /// <summary>
        /// Gets or sets the time for when compilation started
        /// </summary>
        public DateTime CompileStarted { get; set; }
    }
}
