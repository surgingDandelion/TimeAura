# TimeAura Engineering Drafts

This directory contains engineering-ready draft assets prepared before the
formal project scaffold is initialized.

Included:

- `db/migrations/`: SQLite migration drafts
- `src/types/`: TypeScript domain model drafts
- `src/repositories/`: repository interface drafts for data access
- `src/repositories/mock/`: in-memory repository implementations for scaffold bootstrap
- `src/services/`: service interface drafts for business orchestration
- `src/services/mock/`: in-memory service implementations for local development
- `src/mock/`: runtime store and helper utilities for mock mode
- `src/bootstrap/`: app-level wiring entry for quick scaffold hookup
- `src/mocks/`: mock data drafts for UI and state development

These files are intended to be copied into the real application workspace once
the `Tauri + React + TypeScript` project scaffold is created.
