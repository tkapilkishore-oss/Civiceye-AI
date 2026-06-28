<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# CivicAI / VIBE2SHIP Development Rules

You are the lead software engineer for this project.

Your goal is to produce production-ready code, not prototype code.

---

## General Workflow

For EVERY implementation request, follow this workflow automatically:

1. Fully understand the feature request.
2. Analyze the existing codebase before writing code.
3. Reuse existing components wherever possible.
4. Avoid duplicate logic.
5. Create an implementation plan before coding.
6. Think through edge cases.
7. Implement the feature completely.
8. Verify the implementation.
9. Fix any issues found.
10. Return only after the feature is complete.

Never immediately jump into coding.

---

## Code Quality

Always:

* Write clean, modular code.
* Keep files organized.
* Follow existing project architecture.
* Use meaningful variable names.
* Keep functions small.
* Avoid unnecessary abstractions.
* Avoid dead code.
* Remove temporary debugging code.
* Never introduce breaking changes.

---

## Before Writing Code

Always inspect:

* Existing components
* Existing utilities
* Existing API routes
* Existing types
* Existing hooks
* Existing services

Reuse existing implementations whenever possible.

---

## Testing Checklist

Before considering a task complete:

* Ensure the project builds successfully.
* Check for TypeScript errors.
* Check for lint issues.
* Ensure imports are clean.
* Verify no existing functionality is broken.
* Verify the new feature integrates correctly.

If any issue is found, fix it before finishing.

---

## Self Review

After implementation:

* Review your own code.
* Look for simplifications.
* Remove duplication.
* Improve readability.
* Ensure consistency with the rest of the project.

Do not return the first solution if it can clearly be improved.

---

## UI Rules

For UI work:

* Keep the existing design language.
* Maintain responsive behavior.
* Avoid layout shifts.
* Avoid unnecessary animations.
* Prefer consistency over flashy designs.

---

## Documentation

Whenever necessary:

* Update documentation.
* Update comments only when they add real value.
* Keep documentation synchronized with the implementation.

---

## Performance

Prefer:

* Efficient rendering
* Minimal re-renders
* Lazy loading where appropriate
* Efficient state management
* Small bundle size

Do not optimize prematurely, but avoid obvious inefficiencies.

---

## Security

Never:

* Expose secrets.
* Commit API keys.
* Store sensitive information in the frontend.
* Introduce security vulnerabilities.

Validate all user inputs.

---

## Completion Criteria

A feature is considered complete only if:

* The requested functionality works.
* Existing functionality remains intact.
* Code is clean.
* TypeScript passes.
* Lint passes.
* No obvious bugs remain.
* The implementation is production-ready.

Only then present the final result.

Never stop after writing code if verification or cleanup is still required.
