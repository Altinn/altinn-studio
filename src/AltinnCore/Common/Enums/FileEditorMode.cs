using System;
using System.Collections.Generic;
using System.Text;

namespace AltinnCore.Common.Enums
{
    /// <summary>
    /// This enum defines the modes supported by embedded file editor
    /// </summary>
    public enum FileEditorMode
    {
        /// <summary>
        /// All the files associated with the service
        /// </summary>
        All = 0,

        /// <summary>
        /// All the files in the Deployment folder
        /// </summary>
        Deployment = 1,

        /// <summary>
        /// All the files in the Implementation folder
        /// </summary>
        Implementation = 2,

        /// <summary>
        /// All the files in the Metadata folder
        /// </summary>
        Metadata = 3,

        /// <summary>
        /// All the files in the Model folder
        /// </summary>
        Model = 4,

        /// <summary>
        /// All the files in the Resource folder
        /// </summary>
        Resources = 5,

        /// <summary>
        /// All the files in the Test folder
        /// </summary>
        Test = 6,

        /// <summary>
        /// All the files in the Calculation folder
        /// </summary>
        Calculation = 7,

        /// <summary>
        /// All the files in the Dynamics folder
        /// </summary>
        Dynamics = 8,

        /// <summary>
        /// All the files in the Validation folder
        /// </summary>
        Validation = 9,
    }
}
