Launch the test-writer agent to write Jest tests for specified files or features.

Usage:
- `/test src/features/scoring/utils/calculateScores.ts` — write unit tests for the scoring function
- `/test src/components/game/VoteCard.tsx` — write component tests
- `/test src/features/auth/` — write tests for an entire feature module

The agent will:
1. Read the source file(s)
2. Write co-located `__tests__/` test files
3. Cover all critical edge cases (especially scoring scenarios)
4. Run `npm run test:ci` to verify tests pass
5. Return a summary of what was written and any gaps

$ARGUMENTS
