# Plain English rules (our own wording)

These rules are written in our own words. They follow the structure of ASD-STE100 Issue 9 (2025)
but do not copy its text or its dictionary. For the real standard, request the free PDF from ASD:
https://www.asd-ste100.org/STE_downloads.html

Legend: **[S]** = the scorer checks it, **[R]** = you must check it by reading.

## 1. Words
- Use common words with one clear meaning. Prefer "use" to "utilize", "start" to "commence", "about" to "approximately". [S at plain-100, small list only]
- Use one word for one thing in the whole text. Do not switch between synonyms ("check" here, "verify" there). [S, common verb groups]
- Technical names (APIs, files, products, commands) are allowed. Keep them exact. [R]
- Use the verb, not a noun made from it: "configure the server", not "perform the configuration of the server". [S, "perform/conduct/carry out + noun"]
- Do not use words that claim quality: "seamless", "robust", "cutting-edge". Give the number that proves it, or delete the word. [S]

## 2. Noun clusters
- Use no more than 3 nouns in a row. Add "of", "for" or a short clause to break longer chains. [S, heuristic]

## 3. Verbs
- Use the active voice. In descriptions, the passive is acceptable only when the actor is unknown. [S, heuristic]
- Use simple tenses. Avoid "has been done", "will have run". [S at plain-100]
- Avoid -ing forms, except in fixed technical names ("logging", "caching"). [S at plain-100]
- Use one verb, not a verb with a particle ("set up" → "configure", "find out" → "find"). [S, common list]
- Prefer can, will and must to should, could, might, would and may. Keep "may" when it states real uncertainty. [S at plain-100]

## 4. Sentences
- Keep sentences short. Do not remove articles or "that" to make them shorter. [R]
- Do not use contractions. [S]
- Use a vertical list when a sentence holds a series of items. [R]

## 5. Procedures
- 20 words or fewer per sentence. [S]
- One instruction per sentence, unless two actions happen at the same time. [S, heuristic]
- Use the imperative: "Run the tests." [S detects procedures by the first verb]
- Put the condition first: "If X, do Y." [S]

## 6. Descriptions
- 25 words or fewer per sentence. [S]
- Give one new fact at a time. [R]
- One topic per paragraph, no more than 6 sentences. [S]

## 7. Warnings
- Start with the command. Then give the risk: "Do not delete the cache. The build fails without it." [R]

## 8. Punctuation
- Do not use semicolons. [S]
- Hyphenated words, numbers and identifiers count as one word. [S]

## 9. Writing practice
- If a word swap does not make the sentence clear, rewrite the sentence. [R]
- Answer first, then reasons (BLUF, Minto). [R]

## What "80%" means here
plain-80 = all structural rules above that the scorer marks [S] at level 80, plus the [R] rules,
but without the plain-100 extras (-ing forms, perfect tenses, weak modals, wordy-word list).
The score is the share of sentences with no violation. A text "passes" plain-80 at a score of 0.8 or more.
