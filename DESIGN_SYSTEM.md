# Design System Specification

## Objective

The design system for AreWeCookedYet.com should feel premium, editorial, and developer-focused, grounded in a confident dark-first interface with a polished light-mode companion. The brand is intentionally warm and grounded—like a refined coffee bar for AI news and engineering signal discovery.

This document defines the visual system, typography, spacing, and reusable patterns for implementation.

---

## 1) Design Direction

### Core design language
- Premium editorial / developer bias
- Minimal but substantial, with high information density
- Strong legibility and minimal visual noise
- Clear content hierarchy and tactile surfaces
- Dark mode default, with a clean, equally premium light mode for daytime reading

### Visual inspiration
- Linear for information density and calm precision
- Vercel for editorial clarity and minimal framing
- Code-oriented product patterns with strong whitespace and restrained accent color

---

## 2) Typography

### Primary typeface
- Geist Sans (primary recommendation)
- Inter as a strong fallback if Geist is unavailable
- Font stack: `"Geist", "Inter", "Segoe UI", sans-serif`

### Type scale
- Display: 40/48, semibold
- H1: 32/40, semibold
- H2: 24/32, semibold
- H3: 20/28, semibold
- Body: 16/26, regular
- Small: 14/20, regular
- Caption: 12/16, medium

### Editorial rules
- Headlines should feel confident, highly legible, and compact
- Body text should optimize for readability with strong contrast and measured line lengths
- Use weight contrast sparingly; the system should feel precise rather than dramatic
- Use monospace sparingly for metadata, tags, and code-like labels

---

## 3) Color System

### Coffee-inspired palette
The palette should feel warm, grounded, and soft without becoming muddy. Use dark neutrals with warm stone tones and carefully selected amber/bronze accents.

#### Dark mode tokens
- Background: `#0F0E0D`
- Panel: `#171412`
- Surface elevated: `#1D1A17`
- Border: `#2C2622`
- Foreground primary: `#F3EEE8`
- Foreground muted: `#C8BDB4`
- Accent primary: `#C98A52`
- Accent secondary: `#D8B48A`
- Success: `#7FAE8A`
- Warning: `#D6A75E`
- Error: `#C76F6F`
- Focus ring: `#D99A68`

#### Light mode tokens
- Background: `#F7F3EE`
- Panel: `#FFFDFB`
- Surface elevated: `#F1E9E1`
- Border: `#DDD0C5`
- Foreground primary: `#211B17`
- Foreground muted: `#584E46`
- Accent primary: `#8B5E3C`
- Accent secondary: `#B77E4A`
- Success: `#4E7D5C`
- Warning: `#B07C3D`
- Error: `#A85A52`
- Focus ring: `#A8683B`

### Color usage rules
- Dark mode is the default for product surfaces
- Light mode is used for reading and long-form content without breaking the brand character
- Accent colors should be used sparingly to highlight key editorial moments, tags, or signals
- Do not use pure neon colors; warmth and legibility are more important than novelty

---

## 4) Spacing and Sizing

### Base spacing scale
Use an 8px rhythm with a small set of larger spacing values.

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px
- 40px
- 48px
- 64px
- 80px

### Radius scale
- Small: 8px
- Medium: 12px
- Large: 16px
- XL: 20px
- Full pill: 9999px

### Border width
- 1px for default structure
- 2px for focus or press states if required

---

## 5) Layout System

### Grid
- Use a centered max-width content column with generous margins
- Base content column: 72ch reading width for body content and detail views
- Feed pages: 12-column responsive grid for listing layouts
- Use consistent gutters between 24px and 32px depending on viewport

### Shell structure
- Top navigation with logo/brand, secondary links, and admin access affordance
- Content frame with stable vertical rhythm
- Section cards with subtle borders and elevation only in the dark or lightin mode surface variants
- Clean whitespace to support calm reading and product trust

---

## 6) UI Patterns

### Cards
- Cards for list items, feed entries, stats widgets, and admin queue rows
- Border treatment: subtle, almost editorial rather than glossy
- Hover state: slight color shift or subtle shadow increase, not aggressive motion
- Padding: 16px–24px consistent internal rhythm

### Buttons
- Primary button: warm accent fill with accessible contrast
- Secondary button: neutral background with border
- Tertiary button: text-only or low-contrast button for subtle actions
- Height: 36px to 42px for compact actions; 44px–48px for more prominent CTA states

### Badges and labels
- Use for source names, statuses, moderation states, and meta labels
- Keep labels compact and highly readable
- Example states: `Pending`, `Published`, `Rejected`, `AI`, `Research`, `Fed`, `Manual review`

### Inputs and forms
- Minimal but clear borders and strong focus ring
- Use rounded, editorial inputs without heavy skeuomorphic styling
- Admin forms should prioritize speed and low friction

### Tables and data panels
- Use compact rows with clear separators
- Align numeric values to the right when readability benefits from it
- Highlight important columns with accent or muted emphasis rather than loud color

---

## 7) Component usage in the product

### Public homepage
- Feature block introducing the daily editorial feed
- List of publication cards
- Source and date metadata on each item
- Link to article detail page

### Article detail page
- Big headline and metadata row
- Original source link and publication metadata
- Optional “why this matters”/opinion surface in a later phase
- Clean, readable article blocks with balanced whitespace

### Admin moderation queue
- Card-based review list
- Clear approval/rejection actions
- Inline editing for title and source URL
- Keyboard-first interaction design
- Health status badges and logs displayed in a compact right rail or top panel

---

## 8) Motion and Interaction

- Motion should be light and intentional; avoid playful animation
- Use transitions under 200ms for hover and focus states
- Avoid flashiness; emphasize polish and clarity over spectacle
- Keep elevated surfaces subtle and restrained

---

## 9) Accessibility

- Maintain WCAG AA contrast in both light and dark themes
- Use visible focus rings on clickable elements and form controls
- Ensure keyboard navigation flows are clear and efficient
- Keep text sizes and line-height comfortable for long-form reading

---

## 10) Implementation Recommendation

Use Tailwind CSS with a custom design token layer and a thin component abstraction built from accessible primitives. A shadcn/ui-style baseline is recommended for consistent button, card, form, and select patterns without over-engineering the product.

This gives the project a polished, professional foundation while keeping implementation lightweight and maintainable.
