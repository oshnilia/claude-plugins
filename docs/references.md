# References

Collected on 2026-10-03, before any code was written. Star counts are from that date.

## 1. The post that started this

- Andrej Karpathy, 2026-10-02 00:37 UTC: https://x.com/karpathy/status/2105819303471976479
  - Get the exact text: `curl -s https://api.fxtwitter.com/karpathy/status/2105819303471976479 | jq -r .tweet.text`
  - Shape of the post: intro → writing (ask for ASD-STE100, or "80% of the way") → diagrams → interactive HTML →
    explainer videos (his most bullish format) → summary.
  - Summary in our words: models do more of the work, so human time moves to understanding and oversight;
    code is cheap, so a large throwaway artifact for one question now makes sense.
  - The attached image is an STE cheat sheet. It marks "approximately" as not approved, which is wrong
    (see the official FAQ: https://www.asd-ste100.org/STE_faq.html).
- Replies worth keeping in mind:
  - eliebakouch: interactive HTML is the most time-efficient format, but models choose the level of abstraction badly.
  - somi_ai: a wrong claim inside a nice animation is harder to catch than a wrong sentence.
  - originell: combine STE with the Google developer documentation style guide for code.
  - elliotarledge: strict STE becomes tiring after one or two weeks.
- Earlier context:
  - 2026-05-11, HTML answers: https://x.com/karpathy/status/2053872850101285137
    (after Thariq Shihipar: https://simonwillison.net/2026/May/8/unreasonable-effectiveness-of-html/)
  - 2025 LLM Year in Review: https://karpathy.bearblog.dev/year-in-review-2025/
  - Software 3.0 (generate, then verify fast through a GUI): https://www.latent.space/p/s3

## 2. ASD-STE100

- Issue 9, 15 January 2025. 53 writing rules in 9 sections. About 900 approved words, about 1,200 non-approved words with replacements.
- Free PDF by request: https://www.asd-ste100.org/STE_downloads.html
- Copyright and EU trademark of ASD. Do not redistribute the rules text or the dictionary. ASD does not certify tools.
  Do not claim compliance or use the mark: https://www.asd-ste100.org/STEsoftware.html
- Evidence that a short instruction gets most of the effect (one line ≈ a 4.7K-token skill, 58% cheaper):
  https://whoislewys.com/blog/2026/08/20/simpler-english/
- Open-source STE work:
  - AminBlg/SimpleEnglish (3.7k★, MIT): https://github.com/AminBlg/SimpleEnglish — rule catalog in own words, builds the dictionary from the user's own PDF.
  - danyuchn/asd-ste100-skill (2.9k★, MIT): https://github.com/danyuchn/asd-ste100-skill
  - toonooby/ste100-plugin (strictness slider): https://github.com/toonooby/ste100-plugin
  - sjtower/ste-plugin: https://github.com/sjtower/ste-plugin
  - Checkers: https://github.com/sourdough-bread/asd-ste100-checker , https://github.com/amoslives/vale-ste
  - Do NOT bundle: osolmaz/ste100, dfch/biz.dfch.AsdSte100Vocab (they ship Issue 9 dictionary data).

## 3. Format and explainer tools

- 0xGondarxyz/output-ladder (Claude Code mod: re-explain buttons, STE score in the status line): https://github.com/0xGondarxyz/output-ladder
- JohnQinAMD/llm-output-explainer (claims with sources): https://github.com/JohnQinAMD/llm-output-explainer
- ymandrikov/explain-change (explain agent changes, keep decision notes): https://github.com/ymandrikov/explain-change
- ashryaagr/karpathy-output-style: https://github.com/ashryaagr/karpathy-output-style
- nicobailon/visual-explainer (10k★): https://github.com/nicobailon/visual-explainer
- cathrynlavery/diagram-design (43k★): https://github.com/cathrynlavery/diagram-design
- HumanLayer show-me: https://www.humanlayer.com/blog/show-me-skill
- Video (v2): https://github.com/heygen-com/hyperframes , https://github.com/3b1b/manim , https://github.com/FavioVazquez/showtime

## 4. Session observation prior art

- Post-hoc viewers: daaain/claude-code-log, simonw/claude-code-transcripts, es617/claude-replay, matt1398/claude-devtools, kenn-io/agentsview, jhlee0409/claude-code-history-viewer (has a feature called "Session Board").
- Live: roykollensvendsen/session-tree (live task graph), hiroyannnn/devctx, phiat/claude-esp, disler/claude-code-hooks-multi-agent-observability.
- Memory and context hand-back: thedotmack/claude-mem (3-layer context: index → timeline → details), who96/claude-code-context-handoff, koenvdheide/prep-compact.
- Gap we fill: a typed tree goal → question → action → finding / decision / open question, written to a standard,
  live inside the app, and fed back to Claude after compaction.

## 5. Writing and structure frameworks

- Minto, The Pyramid Principle; SCQA. Skill example: https://github.com/millwright-labs/minto-pyramid-skill
- Issue and hypothesis trees: Conn & McLean, Bulletproof Problem Solving.
- Toulmin model: https://owl.purdue.edu/owl/general_writing/academic_writing/historical_perspectives_on_argumentation/toulmin_argument.html
- Likelihood vs confidence (ICD 203): https://en.wikipedia.org/wiki/Words_of_estimative_probability
- ADR: Nygard https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions , MADR https://adr.github.io/madr/ , Y-statements https://medium.com/olzzio/y-statements-10eb07b5a177
- Diátaxis: https://diataxis.fr/
- Google developer documentation style: https://developers.google.com/style/highlights , Technical Writing One: https://developers.google.com/tech-writing/one
- Microsoft style, top 10 tips: https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice
- Inverted pyramid: https://www.nngroup.com/articles/inverted-pyramid/ ; progressive disclosure (≤2 levels): https://www.nngroup.com/articles/progressive-disclosure/
- Plain language: ISO 24495-1:2023; https://digital.gov/guides/plain-language
- Explorable explanations: https://worrydream.com/ExplorableExplanations/ , https://explorabl.es/ , https://distill.pub/2017/research-debt/
- Tufte: https://www.edwardtufte.com/ ; C4 model: https://c4model.com/
- Russian: М. Ильяхов, Л. Сарычева, «Пиши, сокращай» (информационный стиль); Нора Галь, «Слово живое и мёртвое» (канцелярит).

## 6. Claude Code plugins and mods

- Marketplace schema: https://code.claude.com/docs/en/plugins/marketplace-reference
- Plugin manifest: https://code.claude.com/docs/en/plugins/manifest-reference
- Components: https://code.claude.com/docs/en/plugins/components
- Mods: https://code.claude.com/docs/en/plugins/mods/overview , https://code.claude.com/docs/en/plugins/mods/reference
- Hooks: https://code.claude.com/docs/en/hooks ; output styles: https://code.claude.com/docs/en/output-styles ; skills: https://code.claude.com/docs/en/skills
- Where plugins load (claude.ai, Cowork, Claude Code): https://claude.com/docs/plugins/platform-support
- Mods need Claude Code 2.1.287 or later.
