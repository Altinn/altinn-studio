# Frontend Performance Data Collection Strategy

- Status: Proposed
- Deciders: Team Altinn Studio
- Date: 12.11.2025

## Result

To be decided by the team.

## Problem context

As we implement Frontend Next, a major refactoring initiative, we need to define what performance data to collect, where to collect it, and how to monitor it. Currently, we lack systematic performance data collection, making it difficult to validate that our refactoring efforts deliver the expected performance gains and to prevent performance degradations from reaching production. Such data collection is also useful for detecting errors before deploy or in production without our users having to report them. This again facilitates quicker recovery and more thorough stability across our apps.

### System Architecture Context

The platform consists of an unknown amount of .NET applications that use a shared backend library (`src/App/backend/`) and reference a frontend (`src/App/frontend/`) deployed on a CDN via script tags in the HTML they serve. Applications are deployed in Kubernetes on Azure and are individually configurable with both pre-determined features and custom code. All apps also run on the Altinn infrastructure.

## Decision drivers

- D1: Ability to measure and validate Frontend Next performance improvements
- D2: Early detection of performance regressions in CI
- D3: Continuous monitoring of frontend performance metrics in production
- D4: Data must be easily monitored and visualized for actionable insights
- D5: Scalable solution that works with hundreds of different applications
- D6: Solution should not add a significant amount of complexity to the project, both with regards to development and maintenance

## Data Types

- **Initial Load Performance**: Time to First Byte (TTFB), First Contentful Paint (FCP), Largest Contentful Paint (LCP)
- **Accessibility Metrics**: Color contrast ratios, keyboard navigation support, screen reader compatibility
- **Web Vitals**: Core Web Vitals (LCP, FID, CLS) and supplementary vitals (TTFB, FCP, INP)
- **Error Tracking**: JavaScript errors, network failures, console warnings, unhandled promise rejections
- **User Interaction Data**: Click patterns, form submission failures, navigation flows

## Collection Points

- **Synthetic Monitoring in CI/CD**: Automated tests in controlled environments

  - Provides consistent baseline measurements for regression detection
  - Runs on predictable infrastructure with standardized conditions
  - Excellent for early warning of performance issues before deployment

- **Real User Monitoring in Production**: Data collected from actual users

  - JavaScript errors, network failures, user interaction patterns, performance metrics from actual users
  - Captures real-world performance across diverse devices, networks, and usage patterns
  - Provides insights into actual user experience and business impact

- **Load Testing**: Performance under realistic user loads
  - Validates performance under stress conditions
  - Tests scalability and identifies bottlenecks

## Alternatives considered

- A1: Comprehensive data collection strategy (synthetic + production monitoring + load testing)
- A2: Production-only monitoring (RUM only)
- A3: Development-only monitoring (synthetic only)

## Pros and cons

### A1: Comprehensive data collection strategy (synthetic + production monitoring + load testing)

- Good, because it enables early detection through synthetic monitoring and validates real impact through RUM (D1, D2)
- Good, because it provides continuous monitoring of actual user experience (D3)
- Good, because comprehensive data enables detailed analysis and correlation (D4)
- Good, because it can scale across hundreds of applications (D5)
- Bad, because it generates significant amounts of data that need to be properly managed and monitored (D6)
- Bad, because it requires coordination across multiple collection points (D6)

### A2: Production-only monitoring (RUM only)

- Good, because it provides continuous monitoring of actual user experience (D3)
- Good, because it has lower complexity with single collection point (D6)
- Bad, because it cannot detect regressions before they reach users (D2)
- Bad, because it lacks controlled baseline measurements for validation (D1)

### A3: Development-only monitoring (synthetic only)

- Good, because it provides consistent baseline measurements (D1)
- Good, because it enables early regression detection (D2)
- Good, because it has lower complexity with single collection point (D6)
- Bad, because it cannot validate real user impact (D3)
- Bad, because it may not scale well without production validation (D5)
