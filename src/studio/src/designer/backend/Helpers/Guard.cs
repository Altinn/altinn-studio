using System;
using System.Collections.Generic;

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
        /// The assert argument in range. Between 0 and list.Count - 1;
        /// </summary>
        /// <param name="list"> The list. </param>
        /// <param name="index"> The index. </param>
        /// <param name="argumentname"> The argument name. </param>
        /// <typeparam name="T">Don't really care.. </typeparam>
        /// <exception cref="ArgumentOutOfRangeException">Thrown when index out of bounds.</exception>
        public static void AssertArgumentInRange<T>(IList<T> list, int index, string argumentname)
        {
            if (index < 0 || (list != null && index >= list.Count))
            {
                throw new ArgumentOutOfRangeException(argumentname ?? "?");
            }
        }

        /// <summary>
        /// Assert that org and app arguments are present (not null or whitespace).
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        public static void AssertOrgApp(string org, string app)
        {
            AssertArgumentNotNullOrWhiteSpace(org, nameof(org));
            AssertArgumentNotNullOrWhiteSpace(app, nameof(app));
        }
    }
}
