using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.PlatformServices.Process
{
    public abstract class TaskBase
    {
        /// <summary>
        /// hallooo asdf
        /// </summary>
        public abstract void HandleTaskComplete(ProcessChangeContext processChange);

        /// <summary>
        /// 
        /// </summary>
        public abstract void HandleTaskStart(ProcessChangeContext processChange);
    }
}
