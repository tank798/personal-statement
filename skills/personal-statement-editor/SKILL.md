---
name: personal-statement-editor
description: Edit and rewrite personal statements, statements of purpose, and similar application essays against a local library of approved templates and house-style notes. Use when the user uploads polished example statements and asks for section-by-section feedback, wording cleanup, logic fixes, or a full revised draft that preserves the applicant's facts while sounding more natural and convincing.
---

# Personal Statement Editor

## Overview

Use this skill to turn a local folder of approved examples into a repeatable editing workflow. Optimize for believable voice, clearer logic, and tighter wording; do not optimize for maximal flourish.

## Workspace Convention

Expect these paths in the active workspace:

- `templates/`: approved reference statements, ideally one file per example
- `incoming/`: drafts that need comments or rewriting
- `outputs/`: saved feedback and rewritten drafts when the user asks for files
- `references/editing-principles.md`: house style, recurring preferences, and do/don't rules
- `references/template-index.md`: template metadata used to pick the closest examples quickly

If a path is missing, create the minimal structure before continuing.

## Workflow

### 1. Build the editing context

1. Read `references/editing-principles.md` first.
2. Read `references/template-index.md` and select 1-3 templates that best match the draft by:
   - target program or use case
   - discipline or research area
   - applicant profile and experience level
   - tone and structure
3. Open only the selected template files unless the user asks for a broader comparison.
4. If a source file is `.docx`, extract the text first. Use the `doc` workflow when formatting or tracked-change fidelity matters.

### 2. Diagnose the draft

Work section by section. Infer sections by purpose, not just paragraph breaks. Typical sections are:

- opening motivation
- academic or professional background
- one or two core experience paragraphs
- fit with program, lab, or role
- closing direction

Check for:

- vague motivation with no concrete trigger
- chronology or causality that feels jumpy
- repeated claims stated in slightly different words
- inflated language unsupported by facts
- long sentences hiding a simple point
- experience paragraphs that list events but do not show relevance
- conclusions that repeat earlier material without adding forward motion

For a tighter checklist by section, read `references/section-checklist.md`.

### 3. Give section-level comments

For each section, output:

- a short label
- what is not working
- what to change
- an optional note if factual clarification is needed

Use a natural reviewer voice. Keep it human, slightly casual, and specific. Good examples:

- "This paragraph has enough substance; it just reads a bit tight right now, so the point gets buried."
- "The experience itself is solid, but the paragraph is trying to do two jobs at once."
- "This is not empty, but it still feels generic because the motivation never lands on one concrete reason."

Avoid bland filler such as "overall this is good" unless it leads to a concrete suggestion.

### 4. Rewrite the full statement

Preserve the applicant's facts, chronology, and claims unless the user explicitly asks for deeper restructuring. While rewriting:

- tighten wording and remove empty modifiers
- make the logic between paragraphs explicit
- keep each paragraph doing one main job
- borrow structure and tone from templates, not sentences
- do not fabricate awards, metrics, faculty interests, or life events
- if a key fact is missing, mark it as `[To confirm: ...]` instead of guessing

When multiple rewrite options are plausible, prefer the version that sounds credible and controlled rather than ornate.

### 5. Deliver the output

Default output order:

1. `Referenced templates`
2. `Section-by-section comments`
3. `Revised full statement`
4. `Open questions` if any

Match the user's requested language. If not specified, follow the draft's dominant language. A common default for this workflow is Chinese feedback plus a rewritten essay in the source language.

If the user asks to save files, use:

- `outputs/<draft-name>-review.md`
- `outputs/<draft-name>-rewrite.md`

## Template Selection Heuristics

Prefer templates that overlap on two or more of these dimensions:

- same application category: master's, PhD, exchange, scholarship, or job-adjacent statement
- similar field: CS, economics, humanities, and so on
- similar evidence type: research-heavy, internship-heavy, work-heavy, course-driven, or career-switch narrative
- similar tone: restrained, analytical, narrative, or direct
- similar paragraph architecture

If no single template is close enough, combine:

- one template for structure
- one template for tone
- one template for handling a similar experience type

## Output Skeleton

Use this skeleton unless the user asks for a different format:

```markdown
## Referenced templates
- `template-id`: why it was chosen
- `template-id`: why it was chosen

## Section-by-section comments

### 1. [section label]
[2-4 sentences of natural feedback]

### 2. [section label]
[2-4 sentences of natural feedback]

## Revised full statement
[full revised statement]

## Open questions
- [only include if needed]
```

## Guardrails

- Do not copy distinctive template sentences into the final draft.
- Do not overwrite the applicant's voice with generic admissions prose.
- Do not smooth away important specifics just to sound polished.
- Flag contradictions instead of silently fixing them when the fix would change meaning.
- If the user provides multiple approved templates with conflicting styles, follow `references/editing-principles.md` over any single template.
