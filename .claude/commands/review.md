Launch the code-reviewer agent to review recently changed or specified files.

Usage:
- `/review` — reviews all files changed since the last commit (git diff HEAD)
- `/review src/features/scoring/` — reviews a specific path
- `/review src/features/auth/services/authService.ts` — reviews a single file

The agent will check for: TypeScript correctness, architecture compliance, security issues,
Firebase/real-time patterns, performance, coding conventions, i18n, and scoring logic.

It returns a structured report with: Critical Issues, Warnings, Nitpicks, and a Verdict.

$ARGUMENTS
