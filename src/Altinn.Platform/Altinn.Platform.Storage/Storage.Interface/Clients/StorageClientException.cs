using System;
using System.Collections.Generic;
using System.Runtime.Serialization;
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

        /// <summary>
        /// Sonarcloud wanted this 
        /// </summary>
        /// <param name="info"></param>
        /// <param name="context"></param>
        protected StorageClientException(SerializationInfo info, StreamingContext context)
             : base(info, context)
        {
        }

        /// <summary>
        /// Gets the object data
        /// </summary>
        /// <param name="info">info</param>
        /// <param name="context">context</param>
        public override void GetObjectData(SerializationInfo info, StreamingContext context)
        {
            base.GetObjectData(info, context);
        }
    }
}
