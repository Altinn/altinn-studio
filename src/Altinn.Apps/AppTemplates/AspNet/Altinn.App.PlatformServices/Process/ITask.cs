using Altinn.App.PlatformServices.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Altinn.App.PlatformServices.Process
{
    public interface ITask
    {

        void HandleTaskStart(ProcessChangeContext prosessChangeContext)
    }
}
