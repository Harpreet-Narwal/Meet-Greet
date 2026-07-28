# Mulaqat — Design System v2 · "Quiet Editorial"

> **Status:** This supersedes the "Apple-grade" direction in `plan-1-social-dining-app.md` §7 and the original design section of `IMPLEMENTATION_PLAN.md` §8. Where they disagree, **this file wins**.
>
> **Reference:** [normalisboring.es](https://normalisboring.es) — studied and measured, not copied. What follows is the grammar extracted from it, adapted to a social product with booking flows, and corrected where the reference makes choices we can't afford.

---

## 1. The thesis

The reference sells calm. Its confidence comes from three things and nothing else:

1. **Extreme type-scale contrast** — display type at ~14× the body size, with *negative leading* so headlines lock into solid typographic blocks.
2. **Mixed-face headlines** — geometric sans caps and ultralight serif *italic* in the same line. This is the signature move.
3. **Air as the primary material** — ~12rem of section padding, no cards, no shadows, no borders, no radii. Content sits directly on paper.

Mulaqat takes all three. What we add is warmth (this is a product about people eating together, not empty houses) and what we refuse is anything that trades performance for reverence.

**One-line brief:** *an evening that is about to happen, set in type.*

---

## 2. What we deliberately do NOT copy

This section matters as much as the rest. A senior read of the reference finds four choices that are wrong for us:

| Reference does | We do instead | Why |
|---|---|---|
| **Blocking preloader** with a 0→100% counter before content paints | No preloader. Content paints immediately; a 400ms mask-reveal runs on already-painted markup | We chose Next.js *for SEO*. A preloader destroys LCP and our Lighthouse ≥ 90 / SEO ≥ 95 gates. Non-negotiable. |
| `html { font-size: 1.0417vw }` — fluid root | Root stays at browser default; **every size token is its own `clamp()`** in vw | Overriding root font-size breaks browser zoom and a user's font-size preference. It's a real accessibility bug, not a style choice. |
| Body copy at `0.85rem` (≈11px at 1280px) | Body floors at **16px**, small text at 14px | 11px body is unreadable and fails WCAG in practice. Display type stays dramatic; reading text does not. |
| Scroll-jacking + Lenis smooth-scroll everywhere | Lenis **only** on marketing routes, disabled under `prefers-reduced-motion`; native scroll in the app shell | Smooth-scroll hijacking a booking flow or the game room is hostile. Motion serves the brochure, never the transaction. |

Add one more rule of our own: **the editorial language governs public/marketing surfaces. The app shell adapts it.** A 9rem headline belongs on a landing page, not above a payment button. Inside `/tonight`, `/explore`, booking, and the game room: same palette, same faces, same rules — but real touch targets, visible affordances, and type that tops out around `--fs-h3`.

---

## 3. Color

Muted, multi-hue, warm. The reference's restraint comes from using *several* desaturated accents rather than one loud one — keep that.

```css
:root {
  /* ground + ink */
  --paper:      #EDE5D9;   /* warm beige — the primary surface */
  --paper-2:    #E3D9C9;   /* recessed band, alternate section */
  --ink:        #16120D;   /* warm near-black — all body text */
  --ink-70:     #4A423A;   /* secondary text */
  --ink-45:     #6E6459;   /* tertiary, meta, captions */
  --rule:       #C9BFB0;   /* hairline rules and dividers */

  /* accents — each has ONE job, never decorative */
  --clay:       #B95440;   /* primary accent: links, active, underlines, marquee */
  --haldi:      #C9A03F;   /* RESERVED: Spark / celebration only */
  --neem:       #93A085;   /* verified, safety, success */
  --dusk:       #BCCBD6;   /* cool band, info surfaces */
  --alert:      #9E3B30;   /* errors, destructive */
}

:root[data-theme="dark"], @media (prefers-color-scheme: dark) {
  --paper:      #15120E;
  --paper-2:    #1F1A15;
  --ink:        #EDE5D9;
  --ink-70:     #B3A899;
  --ink-45:     #8A8073;
  --rule:       #3A332B;
  --clay:       #D2694F;   /* lifted for contrast on dark ground */
  --haldi:      #D9AC50;
  --neem:       #A6B396;
  --dusk:       #8FA3B0;
  --alert:      #C4574A;
}
```

**Contrast rules — enforce these, they are not suggestions:**

- `--ink` on `--paper` ≈ 15:1. All reading text uses it.
- `--ink-45` on `--paper` ≈ 4.6:1 — meta and captions only, never long-form.
- **`--clay` never sets small text.** It is ~4.0:1 on paper: fine for large display type, rules, fills and hover states; not for 16px body. If you want emphasis in a paragraph, use `--ink` with italic, not clay.
- **Primary buttons are `--ink` fill with `--paper` text** (≈15:1). Black buttons are correct for this aesthetic *and* the safest contrast. Clay is for underlines and hovers.
- `--haldi` appears in exactly one place in the product: the mutual-Spark moment. If it shows up anywhere else it stops meaning anything.

---

## 4. Typography

Three faces, three jobs — mirroring the reference's Editorial New / Juana / Izmir split.

| Role | Face | Notes |
|---|---|---|
| **Display** | **Instrument Serif** 400 + *Italic* | High-contrast, near-ultralight at large sizes. The italic is the emotional register — use it for the one lowercase phrase inside an uppercase headline. |
| **Body** | **Newsreader** 300/400 + italic | Warm editorial serif. All reading text, paragraphs, chat, descriptions. |
| **Micro / data** | **JetBrains Mono** 400/500 | Uppercase labels, eyebrows, prices, countdowns, seat counts, table numbers, dates. `font-variant-numeric: tabular-nums`. |

All three self-hosted via `next/font/google` (zero CDN requests, zero layout shift, and they're open-licensed — do not substitute the reference's licensed faces).

> The mono is a deliberate departure from the reference's geometric sans. Justification: this product is dense with numbers — ₹399, 2 seats left, T-24:00:00, Table 03. Mono makes those legible and gives the editorial look a working-document edge that suits a booking product.

### Scale

Every token is an independent `clamp()`. Display scales hard with the viewport; reading text barely moves and never drops below 16px.

```css
:root {
  --fs-display-xl: clamp(2.9rem, 9.5vw, 11rem);   /* hero only, once per page */
  --fs-display:    clamp(2.2rem, 6.2vw, 7rem);    /* section statements */
  --fs-h2:         clamp(1.75rem, 3.4vw, 3.6rem);
  --fs-h3:         clamp(1.15rem, 1.7vw, 1.9rem);
  --fs-lead:       clamp(1.1rem, 1.35vw, 1.5rem); /* standfirst paragraph */
  --fs-body:       clamp(1rem, 1.05vw, 1.15rem);  /* 16px floor */
  --fs-small:      clamp(0.875rem, 0.85vw, 0.95rem);
  --fs-label:      clamp(0.68rem, 0.7vw, 0.8rem); /* mono, uppercase */

  --lh-display: 0.88;   /* negative leading — the reference's signature */
  --lh-tight:   1.05;
  --lh-body:    1.65;
  --track-label: 0.16em;
  --track-display: -0.02em;
}
```

**Rules:**
- `--fs-display-xl` appears **once per page**. A second one halves the impact of the first.
- Display type is always `line-height: 0.88` and `letter-spacing: -0.02em`. Lines must feel like a stacked block, not a list.
- Headings get `text-wrap: balance`; paragraphs `text-wrap: pretty` and `max-width: 62ch`.
- Uppercase mono labels always carry `letter-spacing: 0.16em`. Uppercase without tracking looks broken.
- Never bold a serif display face to add emphasis. Emphasis comes from *size*, *italic*, or *air*.

### The signature headline treatment

One phrase per headline switches to Instrument Serif *italic*, lowercase, while everything around it is uppercase roman. The italic phrase carries the human half of the sentence:

```html
<h1 class="display">
  TABLES THAT<br>
  TURN STRANGERS<br>
  INTO <em>your people</em>
</h1>
```

Applied across the product:
- `SIX SEATS. ONE TABLE. <em>no small talk.</em>`
- `THE VENUE DROPS <em>tomorrow.</em>`
- `YOU BOTH SAID <em>yes.</em>` *(the Spark moment)*

Use it once per view. It is a punctuation mark, not a texture.

---

## 5. Layout & space

```css
:root {
  --gutter:     clamp(1.25rem, 3.2vw, 3.5rem);  /* page side padding */
  --section:    clamp(5rem, 12vw, 12rem);       /* vertical rhythm between sections */
  --section-sm: clamp(3rem, 6vw, 6rem);
  --gap:        clamp(1rem, 1.5vw, 1.5rem);
  --measure:    62ch;
  --radius:     0px;                            /* everything square… */
  --radius-media: 0.75rem;                      /* …except media */
}
```

- **12-column grid**, `gap: var(--gap)`, full-bleed sections with `--gutter` side padding.
- **No cards.** No shadows, no borders, no background panels for grouping. Separation comes from space, then from a 1px `--rule` hairline. If something feels like it needs a card, it needs more space instead.
- **Asymmetry over centering.** Headlines flush left; standfirst paragraphs offset into columns 7–12; meta rows pinned to the outer edges. Centered layouts read as default; offset reads as composed.
- Media is the only element with a radius, and the only element allowed to be full-bleed.

---

## 6. Section patterns (build these as components)

Named after the reference's `mod-*` architecture, which is worth keeping — it makes page composition declarative.

| Component | Purpose |
|---|---|
| `<Statement>` | A `--fs-display` headline with the mixed-face treatment, optional eyebrow label. The workhorse. |
| `<Standfirst>` | Small serif paragraph at `--measure`, offset to the right columns. Deliberately quiet against the display type. |
| `<Marquee>` | Infinite horizontal scroll of a repeated phrase. Used once, for event types. Pauses on hover and under `prefers-reduced-motion`. |
| `<Sequence>` | Numbered `01 / 02 / 03` steps. **Only for real sequences** — how-it-works, booking progress. Never for a plain list; the numbers must mean order. |
| `<Index>` | ⭐ The events list. See below. |
| `<MediaBand>` | One or two images, full-bleed or gutter-width, `--radius-media`. |
| `<Footer>` | Email, Instagram, legal, `MULAQAT ©2026`. Mono, small, wide-tracked. |

### ⭐ `<Index>` — events as a typographic index

The single most important adaptation. The reference lists architecture projects as a numbered index (`2024 · OLEIROS · 01 · LA SOLANA`). Event listings map onto it exactly:

```
01   WED 12 AUG   INDIRANAGAR      DINNER FOR SIX        ₹399   2 SEATS LEFT
02   SUN 16 AUG   CUBBON PARK      RUN CLUB SUNDAY       FREE   9 SEATS LEFT
03   SAT 22 AUG   KORAMANGALA      GAME NIGHT            ₹199   SOLD OUT
```

Each row is a full-width link: hairline top rule, mono meta, serif event name at `--fs-h3`. On hover the row's name shifts right by `0.4rem`, a clay underline wipes in from the left, and a small warm media thumbnail follows the cursor.

**Why this over photo cards** — and defend this choice if challenged:
- Every competitor uses photo cards. This is instantly distinctive.
- It is real crawlable text, not `alt` attributes — directly serves the SEO mandate.
- It renders instantly with no image LCP cost.
- It scales to 40 events without becoming a wall of stock photography.
- Scarcity (`2 SEATS LEFT`) sits inline in mono, where it reads as *fact* rather than as a marketing badge — which makes it far more persuasive.

Photography still appears, but as deliberate full-bleed `<MediaBand>` moments between sections, not as thumbnails competing for attention.

---

## 7. Motion

GSAP + ScrollTrigger + Lenis is the reference's stack. Ours is lighter: **Framer Motion + IntersectionObserver**, plus Lenis on marketing routes only.

| Moment | Treatment |
|---|---|
| Page enter | Content is already painted. Headlines mask-reveal upward (`clip-path` inset + `translateY(0.4em)`), lines staggered 60ms, 700ms `cubic-bezier(.16,1,.3,1)`. |
| Scroll reveal | Same mask-reveal, triggered once at 15% visibility. Never re-animates on scroll-up. |
| Index row hover | Name shifts `0.4rem`, clay underline wipes L→R (200ms), cursor thumbnail eases with `transform: translate3d()` at ~0.12 lerp. |
| Marquee | Linear, 40s, `will-change: transform`, pauses on hover. |
| Venue reveal (T-24h) | The one theatrical moment: mask lifts on the venue name, mono countdown flips to `REVEALED`. |
| Mutual Spark | Slow `--haldi` radial wash over the ground, 900ms, both first names fading up. No confetti. |

**Non-negotiable:** every one of these sits behind `@media (prefers-reduced-motion: reduce)`, which collapses them to opacity-only or nothing. Marquee stops entirely.

Restraint rule: at most **one** animated element in the viewport at a time. Scattered micro-animations are the tell of a generated page; one orchestrated moment reads as designed.

---

## 8. Copy voice

The reference is austere and Spanish-formal. Ours is austere *and warm* — the type is quiet so the words can be human. Editorial structure, Indian register, no exclamation marks.

- Labels are mono, uppercase, factual: `BENGALURU`, `2 SEATS LEFT`, `T-24:00:00`, `WED · 8PM`.
- Headlines are short and declarative. Never a question, never a pun.
- Paragraphs are one idea, 2–3 sentences, then stop.
- Buttons state the outcome: `Take the quiz`, `Hold my seat`, `Reveal my table` — never `Submit`, never `Get Started`.
- Empty states are calm, not jokey: *"No table booked yet. Wednesday's list opens Monday at noon."*
- Errors say what happened and what to do: *"That seat went a moment ago. Two left at the Koramangala table — want it?"*

Hinglish is welcome where it's natural in body copy, never in UI labels.

---

## 9. Accessibility floor (blocking)

- Body text ≥ 16px. Contrast ≥ 4.5:1 for text, ≥ 3:1 for UI boundaries.
- Visible focus ring: `outline: 2px solid var(--clay); outline-offset: 3px`. Never `outline: none` without a replacement.
- Index rows and marquee items are real `<a>`/`<button>` elements — keyboard reachable, correctly ordered.
- Every animation respects `prefers-reduced-motion`.
- Both themes ship complete; dark is not an inversion, it is designed (`--clay` and `--haldi` are lifted on dark ground).
- Headings are a real `h1→h6` outline. The display treatment is CSS, never a heading-level hack.

---

## 10. Implementation notes for `packages/ui`

- Tokens live in `packages/ui/tokens.css` as CSS custom properties; Tailwind 4 reads them via `@theme`. **No raw hex in components** — this is already in `CLAUDE.md` and it is enforced in review.
- Fonts load through `next/font/google` in `apps/web/src/app/layout.tsx` and expose `--font-display`, `--font-body`, `--font-mono`.
- Section components live in `packages/ui/src/editorial/` (`Statement`, `Standfirst`, `Index`, `Marquee`, `Sequence`, `MediaBand`).
- `prototype/landing.html` in this repo is the **visual reference build** — a working, self-contained page. Port it component-by-component; when in doubt about a spacing or motion value, read it there.
