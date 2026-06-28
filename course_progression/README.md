# Course Progression

A small Node.js project for checking completed and in-progress courses against UQ BCompSc requirements (2022). _Note: you can update the csv files to work for a different course._

The project reads course requirement data from CSV files, compares it against a transcript CSV, and prints a simple progression report with green ticks and red crosses.

**This tool is only intended as a rough personal guide. Please do not treat its output as an official source of truth for I am but a wee lass and can make mistakes ♡**

## What it does

The checker:

* reads program requirements from `data/requirements.csv`
* reads course aliases from `data/aliases.csv`
* reads course metadata from `data/courses.csv`
* reads course groupings from `data/course_groups.csv`
* reads your transcript from `data/transcript.csv`
* checks which requirements are complete or incomplete
* includes `IP` courses in projected progress
* writes a Markdown report to `reports/progression_report.md`

## Setup

Install dependencies:

```bash
npm install
```

## Run

```bash
npm run check
```

or:

```bash
node src/index.js
```

## Output

The script prints a report in the terminal and also creates:

```text
reports/progression_report.md
```

Example output:

```text
✅ core
   status: complete
   completed: 16 / 16-16
   projected: 16 / 16-16
   counted: COMP2048, COMP3506, CSSE1001

❌ plan
   status: incomplete
   completed: 12 / 16-16
   projected: 14 / 16-16
   counted: COMP2140, COMP4403 (IP)
   missing: DECO3801
```

## Transcript format

Your transcript should be saved as:

```text
data/transcript.csv
```

Example:

```csv
courseCode,title,grade,unitValue
CSSE1001,Introduction to Software Engineering,6,2
COMP2048,Theory of Computing,5,2
COMP4403,Compilers and Interpreters,IP,2
```

## Grade handling

The checker treats these as completed:

```text
4, 5, 6, 7, P, PASS, CP, CR, D, HD
```

The checker treats this as in progress:

```text
IP
```

The checker ignores:

```text
W, INC, blank grades
```

`IP` courses are included in projected progress, but not completed progress.

## Data files

### `data/requirements.csv`

Defines high-level requirement buckets.

Example:

```csv
requirement_id,course_ids,min,max
core,"COMP2048|COMP3506|CSSE1001",16,16
plan,"COMP2140|COMP3400|COMP4403",16,16
```

### `data/aliases.csv`

Defines course choice groups.

Example:

```csv
alias_id,course_ids,min,max
MATH1061_OR_MATH1081,"MATH1061|MATH1081",2,2
```

### `data/courses.csv`

Stores course metadata.

Example:

```csv
course_code,title,units,level
COMP2048,Theory of Computing,2,2
COMP3506,Algorithms and Data Structures,2,3
```

### `data/course_groups.csv`

Stores elective pool membership.

Example:

```csv
group_id,course_code
PROGRAM_ELECTIVES,COSC3000
PROGRAM_ELECTIVES,INFS3202
```

## Notes

This is a simple checker. It assigns courses greedily in this order:

1. core
2. plan
3. breadth electives
4. program electives
5. general electives
