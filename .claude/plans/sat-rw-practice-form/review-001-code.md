# Code review 001 — Verdict: ITERATE
Findings: (1) HIGH reflected XSS via print.html ?module= in href; (2) validator banned-term false positives (easter/homecoming/touchdown);
(3) validator gaps: INF blank-at-end, RS 4-6 notes + standard intro, standard stems for BND/FSS/TRN/INF, poem title+attribution;
(4) single-key shortcuts not disableable (WCAG 2.1.4), arrows hijack passage scroll; (5) dialog focus not trapped / background not inert;
(6) Esc in navigator loses focus; (7) review.html crashes on malformed %-hash; (8) stored result may use route 'm1';
(9) server tests lack backslash traversal cases; (10) README should state timer pauses while closed.
Fix list applied in fix round 1 (see impl-summary-fix-1.md).
