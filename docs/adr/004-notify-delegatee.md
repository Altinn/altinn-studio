# Delegation notification for application instance access - User discovery and navigation

- Status: Accepted
- Deciders: Signing Task Force
- Date: 2025-12-06

## Result

- A1: Send correspondence message to delegatee's inbox with direct link to application instance, in addition to existing instance message under relevant "Aktør".

## Problem context

When implementing user-delegated signing flows, users are granted read access to application instances they need to sign. However, the current inbox structure creates a significant user experience problem for delegatees trying to find and access these instances.

Currently, when a user (delegatee) is granted read access to an application instance, the only way to access the instance is through an instance message that appears under a different "Aktør" (the instance owner) in their inbox. This creates several usability issues:

1. Delegatees cannot find the application instance in their usual work-in-progress section
2. They must know to look under a different "Aktør" section
3. They must know which specific "Aktør" owns the instance
4. The discovery path is non-intuitive even for developers with internal knowledge

User testing with internal team members showed conclusively that the current approach is too difficult to navigate, leading to the expectation of support cases from end users who cannot find delegated instances.

## Decision drivers

- B1: Reduce user confusion and support burden
- B2: Provide intuitive discovery path for delegated instances
- B3: Maintain existing functionality for instance owners
- B4: Work within constraints of correspondence service architecture
- B5: Ensure consistent notification experience (inbox + email/SMS)

## Alternatives considered

- A1: Send correspondence message to delegatee's inbox with direct link to application instance
- A2: Modify inbox structure to show delegated instances in main work-in-progress section
- A3: Add notification banner or widget to highlight delegated instances
- A4: Keep current approach and provide user education/documentation

### A1 - Correspondence message to delegatee (CHOSEN)

Send a correspondence message directly to the delegatee's inbox containing:
- Clear indication that they have been delegated access
- Direct link to the application instance
- Context about what action is required

This is sent in addition to the existing instance message under the relevant "Aktör".

### A2 - Modify inbox structure

Restructure the inbox to display delegated instances alongside user's own work-in-progress instances, potentially with special visual indicators.

### A3 - Status quo with documentation

Maintain current approach and provide user guidance on how to navigate to delegated instances.

## Pros and cons

### A1 - Correspondence message to delegatee (CHOSEN)

- **Good**: Supports B1 - provides clear, discoverable path to delegated instances
- **Good**: Supports B2 - delegatees receive direct notification in their primary inbox view
- **Good**: Supports B3 - does not modify existing functionality for instance owners
- **Good**: Supports B4 - works within existing correspondence service capabilities
- **Good**: Supports B5 - creates consistent notification experience across channels
- **Neutral**: Creates duplicate pathways to the same instance
- **Bad**: Increases number of messages in delegatee's inbox

### A2 - Modify inbox structure

- **Good**: Supports B2 - would provide most intuitive user experience
- **Good**: Supports B1 - eliminates confusion about where to find delegated instances
- **Bad**: Does not support B4 - would require significant changes to correspondence service architecture
- **Bad**: Potential impact on B3 - structural changes might affect existing workflows
- **Bad**: High implementation complexity affecting multiple teams and services

### A3 - Status quo with documentation

- **Good**: Supports B3 - no changes to existing functionality
- **Good**: Supports B4 - no technical implementation required
- **Bad**: Does not support B1 unless the end users somehow find the documentation
- **Bad**: Does not support B2 - maintains unintuitive discovery path
- **Bad**: Does not address underlying UX problem

## Decision rationale

The decision favors A1 (correspondence message to delegatee) based on user testing results and the need for an immediate, practical solution that works within existing system constraints.

Key factors in the decision:
1. **User testing evidence**: Internal testing demonstrated that even technically knowledgeable users struggled with the current approach
2. **Practical implementation**: Solution works within existing correspondence service capabilities without requiring architectural changes
3. **Immediate relief**: Provides direct path to delegated instances without waiting for larger inbox restructuring

While A2 (modifying inbox structure) might provide the most elegant long-term solution, it would require extensive cross-team coordination and architectural changes. A1 provides immediate value and can coexist with future inbox improvements. Note that this has been discussed with "Arbeidsflate".
