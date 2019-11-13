using Altinn.App.Services.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.App.Services.Interfaces
{
    public interface IReiseApi
    {
        public List<Stop> GetRuterStops();
    }
}
