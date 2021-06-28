using System;
using System.Collections.Generic;
using System.IO;

namespace Altinn.Studio.Designer.Helpers
{
    /// <summary>
    /// Helper methods to assert null/empty/whitespace
    /// </summary>
    public static class Guard
    {
        /// <summary>
        /// The assert string value not null or white space.
        /// </summary>
        /// <param name="value"> The argument value. </param>
        /// <param name="argumentName">  The argument name.  </param>
        /// <exception cref="ArgumentException">Thrown if value is null or whitespace. </exception>
        public static void AssertArgumentNotNullOrWhiteSpace(string value, string argumentName)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException("Argument null or whitespace.", argumentName ?? "??");
            }
        }

        /// <summary>
        /// Asserts value not null.
        /// </summary>
        /// <param name="value"> The value. </param>
        /// <param name="argumentName"> The argument name.  </param>
        /// <exception cref="ArgumentNullException">Thrown if value is null </exception>
        public static void AssertArgumentNotNull(object value, string argumentName)
        {
            if (value == null)
            {
                throw new ArgumentNullException(argumentName ?? "?");
            }
        }

        /// <summary>
        /// Assert that
        /// </summary>
        /// <param name="paramValue">Parameter value to be checked.</param>
        /// <param name="paramName">Parameter name.</param>
        public static void AssertNotNullOrEmpty(string paramValue, string paramName)
        {
            if (string.IsNullOrEmpty(paramValue))
            {
                throw new ArgumentException($"'{paramName}' cannot be null or empty.", nameof(paramName));
            }
        }

        /// <summary>
        /// Assert that a full path to a sub directory is below a full path to a parent directory.
        /// </summary>
        /// <param name="parentDirectory">Full path to the parent directory.</param>
        /// <param name="subDirectory">Full path to the sub directory including the parent directory.</param>
        public static void AssertSubDirectoryWithinParentDirectory(string parentDirectory, string subDirectory)
        {
            if (!subDirectory.StartsWith(parentDirectory))
            {
                throw new ArgumentException($"The sub directory '{subDirectory}' must be below the parent directory '{parentDirectory}'.");
            }
        }

        /// <summary>
        /// Assert that a full path to a file is below a full path to a parent directory.
        /// </summary>
        /// <param name="parentDirectory">Full path to the parent directory.</param>
        /// <param name="filePath">Full path to a file including the parent directory.</param>
        public static void AssertFilePathWithinParentDirectory(string parentDirectory, string filePath)
        {
            if (!filePath.StartsWith(parentDirectory))
            {
                throw new ArgumentException($"The file '{filePath}' must be below the parent directory '{parentDirectory}'.");
            }
        }

        /// <summary>
        /// Assert that a specified directory exists.
        /// </summary>
        /// <param name="directoryPath">Full path to directory.</param>
        public static void AssertDirectoryExists(string directoryPath)
        {
            if (!Directory.Exists(directoryPath))
            {
                throw new DirectoryNotFoundException($"Could not find the specified directory at '{directoryPath}'");
            }
        }
    }
}
