using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.Common.Process
{
    /// <summary>
    /// Defines the 
    /// </summary>
    public enum ProcessSequenceFlowType
    {
        /// <summary>
        /// Complete the current task and move to next process element. This is the default 
        /// </summary>
        CompleteCurrentMoveToNext = 0,

        /// <summary>
        /// Abandon the current task and return to next process element. 
        /// </summary>
        AbandonCurrentReturnToNext = 1,

        /// <summary>
        /// Abandon the current task and move to next process element. T
        /// </summary>
        AbandonCurrentMoveToNext = 2,
    }
}
