using System;
using System.Collections.Generic;
using System.Text;

namespace Storage.Interface.Clients
{
    /// <summary>
    /// Exception class for storage exceptions.
    /// </summary>
    [Serializable]
    public class StorageClientException : Exception
    {
        /// <summary>
        /// Exception with plain message.
        /// </summary>
        /// <param name="message">the message</param>
        public StorageClientException(string message) : base(message)
        {
        }

        /// <summary>
        /// Exception with message and inner exception
        /// </summary>
        /// <param name="message">the message</param>
        /// <param name="inner">the exception</param>
        public StorageClientException(string message, Exception inner) : base(message, inner)
        {
        }
    }
}
