---
version: alpha
name: Callus
description: Callus product design system for the Expo mobile app and TanStack web app. A
  near-neutral palette, semantic surface and text tokens, hairline borders, and Geist
  typography. Dark and light values invert across both apps. Destructive red is reserved for
  destructive actions; all other state colors use the neutral ramp.
colors:
  background: "#ffffff" # dark: #0a0a0a; page and app root
  foreground: "#111111" # dark: #ededed; primary text and icons
  card: "#ffffff" # dark: #0f0f0f; cards, dialogs, menus
  card-foreground: "#111111" # dark: #ededed
  popover: "#ffffff" # dark: #141414; stacked surfaces
  popover-foreground: "#111111" # dark: #ededed
  primary: "#0a0a0a" # dark: #ffffff; primary action fill
  primary-foreground: "#ffffff" # dark: #0a0a0a
  secondary: "#fafafa" # dark: #141414; quiet fills
  secondary-foreground: "#0a0a0a" # dark: #ededed
  muted: "#fafafa" # dark: #141414
  muted-foreground: "#666666" # dark: #9a9a9a; secondary text and metadata
  accent: "#f5f5f5" # dark: #1a1a1a; selected and hover surface
  accent-foreground: "#0a0a0a" # dark: #ededed
  destructive: "#b4261a" # dark: #e0726a; errors and destructive actions only
  border: "#eaeaea" # dark: #1f1f1f; default hairline
  input: "#d4d4d4" # dark: #333333; field stroke
  ring: "#888888" # dark: #777777; keyboard focus
  sidebar: "#ffffff" # dark: #0a0a0a; app navigation chrome
  sidebar-foreground: "#666666" # dark: #9a9a9a
  sidebar-border: "#eaeaea" # dark: #1f1f1f
  sidebar-active: "#f5f5f5" # dark: #141414; selected navigation item
  gray-ramp:
    [
      "#fafafa",
      "#f5f5f5",
      "#eaeaea",
      "#d4d4d4",
      "#a3a3a3",
      "#888888",
      "#666666",
      "#333333",
      "#1f1f1f",
      "#141414",
      "#0f0f0f",
      "#0a0a0a"
    ]
typography:
  font-sans: "Geist, ui-sans-serif, system-ui, sans-serif"
  font-mono: "Geist Mono, ui-monospace, SF Mono, Menlo, monospace"
  font-display: "Geist, ui-sans-serif, system-ui, sans-serif"
  heading: { fontFamily: font-sans, fontSize: 17-50px, fontWeight: 600, tracking: -0.04em }
  body: { fontFamily: font-sans, fontSize: 14-16px, fontWeight: 400, lineHeight: 1.55 }
  label: { fontFamily: font-sans, fontSize: 13-14px, fontWeight: 500 }
  mono: { fontFamily: font-mono, fontSize: 11-13px, fontWeight: 400 }
  section-label:
    {
      fontFamily: font-mono,
      fontSize: 11px,
      fontWeight: 500,
      tracking: 0.08em,
      transform: uppercase,
      color: muted-foreground
    }
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  6: 24px
  8: 32px
  10: 40px
  base: 4px
rounded:
  sm: 5px
  md: 6px
  lg: 8px
  xl: 11px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 13px"
    height: 32px
  button-secondary:
    backgroundColor: transparent
    border: "1px solid {colors.input}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 13px"
    height: 32px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 11px"
    height: 32px
  button-danger:
    backgroundColor: transparent
    border: "1px solid {colors.input}"
    textColor: "{colors.destructive}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 13px"
    height: 32px
  input:
    backgroundColor: "{colors.background}"
    border: "1px solid {colors.input}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: 34px
  chip:
    backgroundColor: "{colors.secondary}"
    border: "1px solid {colors.border}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
    padding: "3px 9px"
  card:
    backgroundColor: "{colors.card}"
    border: "1px solid {colors.border}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Callus Design System

Callus uses a restrained, neutral visual language across the web and Expo mobile apps. This
file is the token contract; runtime styles live in the files listed below. Change the tokens
there and here together.

## Sources of truth

| Surface     | Runtime styles                                                                                               | Component system                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Web         | `packages/ui/styles/base-theme.css`, `packages/ui/styles/colors.css`, `apps/web/src/shared/styles/fonts.css` | `@callus/ui` shadcn-derived components and app-local Tailwind |
| Expo native | `apps/native/src/global.css`, `apps/native/src/app/_layout.tsx`                                              | HeroUI Native components styled with Uniwind                  |

The web app imports shared UI tokens as its runtime theme. Keep semantic values aligned with
mobile's HeroUI/Uniwind theme block. Geist Variable and Geist Mono Variable are bundled on web;
Expo loads Geist and Geist Mono from `@expo-google-fonts` before rendering native screens.

## Color and surfaces

Use semantic tokens by role, not raw color values. Light values are in the frontmatter; Dark
values are noted inline. The CSS files provide the corresponding runtime values.

- `background` is the page or app root. `card` and `popover` are raised surfaces.
- `foreground` is primary text and icons; `muted-foreground` is secondary text and metadata.
- `border` is a hairline separator. `input` is the stronger field outline. `ring` marks keyboard
  focus.
- `primary` is reserved for the view's main action. Use `secondary` for quiet controls and
  `accent` for selected or hovered surfaces.
- `destructive` is the only colored status. Success, warning, pending, and connected states use
  foreground/muted-foreground plus a word or symbol.
- In web code, use semantic Tailwind classes such as `bg-background`, `text-foreground`,
  `border-border`, and `text-muted-foreground`. In mobile code, use the matching HeroUI Native /
  Uniwind semantic classes and variables (`bg-background`, `text-foreground`, `bg-surface`).

## Typography

Geist is the UI, heading, and prose family; Geist Mono is for code, IDs, counts, shortcuts, and
section labels. There is no serif display face. Use no more than two weights per view: 400/500
for body and labels, with 600 for headings. Section labels use uppercase mono with modest
tracking. Keep text sizes in the role ranges declared in frontmatter rather than introducing
arbitrary scale values.

On web, `apps/web/src/shared/styles/fonts.css` loads the Geist variable fonts. Expo loads
Geist regular/medium/semibold and Geist Mono regular from `apps/native/src/app/_layout.tsx` before
rendering screens; `apps/native/src/global.css` maps the typography tokens to those font families.

## Spacing and shape

Follow a 4px spacing rhythm: 4, 8, 12, 16, 24, 32, and 40px. Use 8px inside a group, 16px
between related groups, and 32–40px between sections. Keep radii tight and consistent: 5px for
inline controls, 6px for buttons and fields, 8px for cards and menus, and 11px for large or
overlay surfaces. Pills and circular indicators use full rounding.

## Components

### Web

Compose existing components from `@callus/ui` before adding app-local primitives. Buttons use
the existing primary, secondary, outline, ghost, destructive, or link variants. Fields use the
shared Input/Select/Label components. Cards use the card semantic surface and a hairline border.
Use `lucide-react` only for functional controls where an icon improves recognition; do not add
icon chips or decorative icon-pack illustrations. Preserve original colors in authentic brand
marks; they are identity assets, not UI accents or semantic tokens.

### Expo mobile

Use HeroUI Native components and Uniwind semantic tokens. Keep styling in `className` and the
native CSS theme, not raw color literals. Native tab icons use the platform symbol names supported
by Expo Router (`sf` on iOS and `md` on Android). Prefer text or no icon when an affordance is
already clear.

## Depth, motion, and accessibility

Build depth with tonal surfaces and 1px borders rather than prominent shadows. Floating surfaces
may use one soft shadow. Keep state changes immediate; use short motion only when it clarifies a
state transition, and respect reduced-motion preferences on web. Every interactive control needs
a visible focus/selection state and an accessible name. Maintain WCAG AA contrast for body text.

## Voice

Use concise, user-centered copy. Labels and actions use Title Case; helper text uses sentence case.
Name actions with a verb and noun. Errors state what happened and the next action. Avoid filler,
marketing superlatives, and implementation details in user-facing text.

## For contributors

Treat these tokens as the design contract. Add or change semantic roles only when a real use case
requires them, then update both platform styles and this file. Keep colors grayscale except for
destructive actions, use tokenized typography/spacing/radii, and preserve the platform-native
interaction patterns of the web and Expo apps.
