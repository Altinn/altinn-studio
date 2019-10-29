using System;
using System.Collections.Generic;
using System.Text;

namespace Authorization.Interface.Models
{
    /// <summary>
    /// Attribute representations in XACML
    /// </summary>
    public class XacmlContextRequestAttribute
    {
        /// <summary>
        /// xacml string that represents org
        /// </summary>
        public string OrgAttribute { get; set; }

        /// <summary>
        /// xacml string that represents app
        /// </summary>
        public string AppAttribute { get; set; }

        /// <summary>
        /// xacml string that represents isntance
        /// </summary>
        public string InstanceAttribute { get; set; }

        /// <summary>
        /// xacml string that represents task
        /// </summary>
        public string TaskAttribute { get; set; }

        /// <summary>
        /// xacml string that represents party
        /// </summary>
        public string PartyAttribute { get; set; }

        /// <summary>
        /// xacml string that represents user
        /// </summary>
        public string UserAttribute { get; set; }

        /// <summary>
        /// xacml string that represents role
        /// </summary>
        public string RoleAttribute { get; set; } 
    }
}
