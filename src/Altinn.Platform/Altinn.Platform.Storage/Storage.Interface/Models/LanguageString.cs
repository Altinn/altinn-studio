using System;
using System.Collections.Generic;
using System.Runtime.Serialization;

namespace Storage.Interface.Models
{
    /// <summary>
    /// Convenience type to handle multiple languages in a string.
    /// </summary>
    [Serializable]
    public class LanguageString : Dictionary<string, string>
    {
        /// <summary>
        /// public constructor
        /// </summary>
        public LanguageString()
        {
        }

        /// <summary>
        /// Required by sonarcloud
        /// </summary>
        /// <param name="info">info</param>
        /// <param name="context">context </param>
        protected LanguageString(SerializationInfo info, StreamingContext context)
            : base(info, context)
        {
        }

        /// <summary>
        /// Get object data.
        /// </summary>
        /// <param name="info">info</param>
        /// <param name="context">context</param>
        public override void GetObjectData(SerializationInfo info, StreamingContext context)
        {
            base.GetObjectData(info, context);
        }
    }
}
