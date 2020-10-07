using System;
using Altinn.Platform.Events.Models;
using Microsoft.EntityFrameworkCore;

namespace Altinn.Platform.Events.Repository
{
    /// <summary>
    /// Something smart
    /// </summary>
    public class EventsContext : DbContext
    {
        /// <summary>
        /// Something smart
        /// </summary>
        public DbSet<Events> Events { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public EventsContext(DbContextOptions<EventsContext> options) : base(options)
        {
        }

        /// <summary>
        /// Something smart
        /// </summary>
        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.HasDefaultSchema("events");
            base.OnModelCreating(builder);
        }
    }

    /// <summary>
    /// Something smart
    /// </summary>
    public class Events
    {
        /// <summary>
        /// Something smart
        /// </summary>
        public long Sequenceno { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public string Id { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public string Source { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public string Subject { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public DateTimeOffset Time { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        /// Something smart
        /// </summary>
        public string CloudEvent { get; set; }
    }
}