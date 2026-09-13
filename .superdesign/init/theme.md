# Theme

## Compact token summary

The original terminal uses near-black navy panels, cyan neon borders, magenta/green market colors, small condensed monospace typography, and many equally weighted cards.

The first Postbell prototype uses:

- Ink `#0b0d10`, graphite `#14171c`, paper `#f1eee7`
- Cobalt `#6f8cff`, gain `#37c98b`, risk `#ff665a`, amber `#e8b44f`
- Newsreader for display, Inter for interface, DM Mono for market values
- Thin borders, 2–6px radii, three-column desktop shell
- Responsive breakpoints at 1180px, 940px, and 680px

## Raw source locations

The complete CSS sources are:

- `src/public/style.css`
- `src/public/postbell.css`

Both files are self-contained and contain all tokens, selectors, responsive rules, and state styling for their respective routes. Pass the full target CSS file to design generation; both are below the 900-line trimming threshold.

