# Mulaqat — Brand Guide (v1)

## The mark

Six people around a table, viewed from above. The **terracotta circle** is the table; the six dots are the strangers; the single **saffron dot is you** — the new person, the spark. It reads at 16px and scales to a billboard.

| File | Use |
|---|---|
| `icon.svg` | App icon, avatars, loading states, watermark on share cards |
| `logo.svg` | Header/nav on light backgrounds, docs, email |
| `logo-dark.svg` | Dark mode nav, footer on ink backgrounds |
| `favicon.svg` | Browser tab + PWA icon (rounded-square paper tile) |

> ⚠️ The wordmark uses live `<text>` (Inter). Before production, convert it to outlines (open in Figma/Illustrator → outline text → re-export) so it renders identically everywhere. In the app itself, prefer mark + HTML wordmark styled with `next/font` Inter.

## Color

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#FAF7F2` | Light background |
| `--ink` | `#1E1912` | Text, dots on light |
| `--ink-dark-bg` | `#121009` | Dark background |
| `--paper-dark-text` | `#F2EDE4` | Text/dots on dark |
| `--accent` (terracotta) | `#D9603B` | Primary actions, the table, links |
| `--accent-2` (saffron) | `#ECA72C` | Sparks, celebration, "you" dot |
| `--sage` | `#7A8B6F` | Success, verified badges |
| `--danger` | `#C24141` | Errors, destructive actions |

Rules: one accent per screen dominates (terracotta). Saffron is reserved for spark/celebration moments so it keeps its emotional charge. Never place terracotta text on saffron or vice-versa (fails contrast).

## Typography

**Inter** (self-hosted via `next/font`), tight tracking on headings.
- Large title 34/700, tracking −0.5
- Title 24/700 · Body 17/400 · Caption 13/500 uppercase +0.5 tracking

## Voice

Warm, playful, Indian, never corporate. "Your Wednesday table awaits" — not "Event booking confirmed." Hinglish welcome where natural. Never cringe, never pushy, no dark patterns.

## Clear space & misuse

Clear space around mark = one dot diameter. Don't rotate the mark, recolor the dots arbitrarily, add gradients, or put the light logo on photos without a scrim.
