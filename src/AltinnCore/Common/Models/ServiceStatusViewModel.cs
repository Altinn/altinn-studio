using AltinnCore.ServiceLibrary;
using System;
using System.Collections.Generic;
using System.Linq;

namespace AltinnCore.Common.Models
{
    /// <summary>
    /// The service status view model, indicating if it's possible to run manual testing.
    /// </summary>
    public class ServiceStatusViewModel
    {
        /// <summary>
        /// Gets or sets the service identifier.
        /// </summary>
        public ServiceIdentifier ServiceIdentifier { get; set; }

        /// <summary>
        /// Gets or sets the user messages.
        /// </summary>
        public IList<UserMessage> UserMessages { get; set; }  = new List<UserMessage>();

        /// <summary>
        /// Gets or sets the compilation messages.
        /// </summary>
        public IList<CompilationInfo> CodeCompilationMessages { get; set; }

        /// <summary>
        /// Checks if the UserMessages contains any errors.
        /// </summary>
        public bool Error => UserMessages?.Any(m => m.IsError) ?? false;

        /// <summary>
        /// Checks if the UserMessages contains any warnings.
        /// </summary>
        public bool Warning => UserMessages?.Any(m => m.IsWarning) ?? false;

        /// <summary>
        /// The user message.
        /// </summary>
        public class UserMessage : IComparable<UserMessage>
        {
            /// <summary>
            /// Gets or sets a value indicating whether is error.
            /// </summary>
            public bool IsError { get; set; }

            /// <summary>
            /// Gets or sets a value indicating whether is warning.
            /// </summary>
            public bool IsWarning { get; set; }

            /// <summary>
            /// Gets or sets the message.
            /// </summary>
            public string Message { get; set; }

            /// <summary>
            /// Gets or sets the link. Key-value pair where key is url and value is link text.
            /// </summary>
            public KeyValuePair<string, string>? Link { get; set; }

            /// <summary>
            /// Gets the details collection.
            /// </summary>
            public IDictionary<string, string> Details { get; } = new Dictionary<string, string>();

            /// <summary>  Compares UserMessages. Errors first, then warnings, then the rest. </summary>
            /// <param name="other"> The other. </param>
            /// <returns> The <see cref="int"/>.  </returns>
            public int CompareTo(UserMessage other)
            {
                if (other == null)
                {
                    return -1;
                }

                if (IsError == other.IsError && IsWarning == other.IsWarning)
                {
                    return string.Compare(Message, other.Message, StringComparison.CurrentCultureIgnoreCase);
                }

                return IsError || !(other.IsError && IsWarning) ? -1 : 1;
            }

            /// <summary>  The to string. </summary>
            /// <returns>
            /// The <see cref="string"/>.. Actually the Message property.
            /// </returns>
            public override string ToString()
            {
                return Message ?? string.Empty;
            }

            /// <summary>  The error.  </summary>
            /// <param name="msg"> The message. </param>
            /// <returns> The <see cref="UserMessage"/>. An instance marked as error. </returns>
           public static UserMessage Error(string msg)
            {
                return new UserMessage { IsError = true, Message = msg ?? string.Empty };
            }

            /// <summary> Create a warning.  </summary>
            /// <param name="msg"> The message. </param>
            /// <returns> The <see cref="UserMessage"/>. An instance marked as error. </returns>
            public static UserMessage Warning(string msg)
            {
                return new UserMessage { IsWarning = true, Message = msg ?? string.Empty };
            }
        }
    }
}
