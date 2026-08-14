# Backend Modules Map

This directory maps the physical code structure to the 16 Bounded Contexts defined in the EA-Blueprint-Vol2-Application-Architecture.

## Context Mapping

| Blueprint Bounded Context | Physical Module Folder | Layer |
|---------------------------|------------------------|-------|
| Identity & Tenant         | `/auth`, `/company`    | Shared|
| Ledger                    | `/accounting`          | 0     |
| Inventory                 | `/inventory`           | 1     |
| Tax                       | `/tax`                 | 1     |
| Receivables               | `/sales`               | 2     |
| Payables                  | `/purchases`           | 2     |
| Banking                   | `/reconciliation`, `/bankFeed`| 2 |
| Payroll                   | `/payroll`             | 2     |
| Fixed Assets              | `/fixed_assets`        | 2     |
| Cost Centers              | `/settings`            | 2     |
| Manufacturing             | `/manufacturing`       | 2     |
| Budgeting                 | `/budgeting`           | 3     |
| Time Tracking             | `/time_tracking`       | 3     |
| Payments                  | `/payment`             | 3     |
| Integration Gateway       | (To be implemented)    | 3     |
| Reporting                 | `/reports`             | 4     |

## Dependency Rule
A module in Layer N may depend on any module in Layer 0..N-1, and may communicate with modules in the same layer only via domain events (`EventBus`), to avoid layer-internal circular dependencies.
