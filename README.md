# Developmental Disorders

A study game for 14 developmental disorders. One table, 14 disorders across and 10 criteria
down, starts empty except for its criteria. Open each cell and choose its answer from a
dropdown, until the whole table is filled in.

**Play it:** https://periclesrocha.com/developmentaldisorders.game/

It's the sibling of the [arterial tree game](https://periclesrocha.com/arterybloodsupply.game/)
and the [artery irrigation game](https://periclesrocha.com/arteryirrigation.game/), and looks
and scores the same way.

## How it plays

- The original document splits the table into three parts; here they're one table with all
  14 disorders as columns, in the document's order (FAS to Cherubism). The rows are the ten
  criteria: etiology, gene/chromosome, inheritance, pathogenesis, epidemiology, extraoral,
  facial/perioral and intraoral characteristics, dental implications and board pearls.
- Every cell is a dropdown. Its list holds every different answer found in that row across all
  14 disorders, A to Z, so you have to know which disorder each answer belongs to. That's 140
  cells, with 2 to 14 choices each.
- The buttons above the table jump to a disorder's column, light up while it's on screen, and
  fill as its cells are found.
- **Practice** tells you right away whether an answer is right. A wrong pick is crossed out,
  tells you which disorder it belongs to, and counts as a mistake. Right answers in a row build
  a streak.
- **Test** gives no feedback until you press **Check answers**, then scores you. Wrong cells
  are marked in amber; open one to change it, or press **Try the wrong ones again**.
- **Hint** opens a cell and makes its right answer pulse.
- **Study the table** (on the start screen) and **See the full table** (at the end) show the
  whole table, ready to print (five disorders per landscape page).
- With a keyboard: arrow keys move between cells, Enter opens one, and the number keys pick an
  answer.
- The table scrolls sideways with the criteria column and the disorder names kept in place.
  On a phone, the list opens as a sheet from the bottom of the screen.

Score = completion time + 10 seconds per mistake + 20 seconds per hint; lower is better.
Runs that end with **Show answers** don't count.

## Leaderboard

Scores go to a global leaderboard, ranked by each nickname's best score, with one board per
mode (Practice, Test). It uses the
**same Supabase project as the artery games**, with its own table, so `config.js` already has
the right URL and key. Every run is also kept in the player's browser, so the game works
without it.

### Switching it on (about 2 minutes, once)

1. Open the Supabase project the artery games use and go to **SQL Editor**.
2. Start a new query, paste everything in [`supabase/leaderboard.sql`](supabase/leaderboard.sql)
   and click **Run**. It creates the `disorders_scores` table, the `disorders_leaderboard`
   view and the access rules. It doesn't touch the artery games' scores, and it's safe to run
   again.

That's it. Scores finished before this step were kept on the device and are sent the next
time the game opens.

The publishable key in `config.js` is meant to be public. The rules only let it read scores
and add new ones: it can't change or delete a score, set the date or the score itself, post a
time under 20 seconds, or post for the same nickname twice within 15 seconds. To remove a
score, delete its row in Supabase's **Table Editor** (`disorders_scores`).

The tree game's repository has a scheduled workflow that keeps this Supabase project from
pausing, so this repository doesn't need one.

## Editing the content

Everything lives in `data.js`: the ten criteria, then the 14 disorders with their answers, in
the order of the original document (`short` is the name on the jump buttons). Change a word
and the game updates itself. Answers are compared ignoring capitals and extra spaces, so cells
with the same answer share one entry in the list. Semicolons split an answer into separate
lines. No build step.

Changes from the original document: "Clef lip/palate" (FAS, intraoral) reads "Cleft
lip/palate", and "FNB1" (Marfan, etiology and board pearls) reads "FBN1", the fibrillin-1 gene.

## Files

- `index.html`, `styles.css`, `app.js`: the game (plain HTML, CSS and JavaScript)
- `data.js`: the table
- `config.js`: the leaderboard connection (Supabase URL and publishable key)
- `supabase/leaderboard.sql`: the database setup for the leaderboard
- `fonts/`: Atkinson Hyperlegible and Crimson Pro, self-hosted (SIL Open Font License,
  see `fonts/LICENSE.txt`)

## Publishing (one-time setup)

Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch:
**main**, folder **/ (root)**. GitHub republishes the site after every push to `main`.

To run it locally: `python3 -m http.server` in this folder, then open
http://localhost:8000.
