# Internal handling of the signing interface

-   Status: Accepted
-   Deciders: Johannes Haukland, Bjørn Tore on behalf of Team Apps
-   Date: 2024-09-25

## Result

Chosen alternative A2: Unlimited implementations per app.

## Problem context

Apps will expose an interface to app developers for signing logic. The implementation of the interface will
contain logic which derives the relevant signees in the application context.

## Decision drivers

-   B1: Support multiple signees per process task.
-   B2: Support runtime signees decision for app end users.
-   B3: Support different signees for different process tasks.
-   B4: It should be clear how to implement in Altinn Studio.
-   B5: Nice to have: Keep complexity for app developers low.

## Alternatives considered

-   A1: Maximum one implementation of the interface per app.
-   A2: Unlimited implementations per app, process task connected to implementation id with `</altinn:signLogicId>` in `<altinn:signatureConfig>`

## Pros and cons

### A1

-   Good, because B1, B2 and B3 is supported.
-   Bad, because the implementation of the interface must include paths for different tasks to support B3. This undermines B5
-   Bad, because the implementation in Altinn studio would be complex
    -   Adding another signing task would require Studio to append a conditional path to the existing interface implementation

### A2

-   Good, because B1, B2 and B3 is supported.
-   Good, because implementation for studio is trivial, supporting B4.
-   Bad, because more process configuration is required to support B3. This undermines B5
