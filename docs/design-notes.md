# Design direction

AccessPay is a calm review workspace, not a self-voicing accessibility overlay.

Palette: paper white `#ffffff`, cool canvas `#f7f8fc`, ink `#1b2440`, indigo `#3930a5`, secondary text `#566077`, confirmation green `#176342`. Semantic tokens define the corresponding dark and forced-color presentations. Contrast checks and browser scans verify actual combinations.

Typography: locally available Avenir Next with Trebuchet and Arial fallbacks. Large clear review headings, normal sentence case, tabular financial structure. Store A uses a restrained Northstar wordmark; Store B uses heavier Fieldwork lettering and a serif headline. No external font request is needed to read or pay.

Layout: broad merchant details beside a quiet payment panel on desktop. A single column on narrow screens retains DOM reading order. Native forms, details, links, and explicit buttons provide interaction; nothing needs a hover, drag, timer, or microphone.

The memorable home-page element is a paper-like review showing a real demo catalog example. It is labelled Example review and contains no fake payment control or success claim. Product illustrations are local SVGs with context-specific alternatives.
