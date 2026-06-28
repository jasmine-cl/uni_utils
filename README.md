# uni_utils

A small collection of personal university utility scripts.

This repository currently contains tools for:

* calculating GPA from a transcript CSV
* checking course progression against CSV-based degree requirements

These tools are intended for personal planning and experimentation only.

## Projects

### `gpa_insights`

A simple GPA calculator that reads course records from a CSV file and calculates a weighted GPA.

The script excludes withdrawn courses and weights grades by unit value.

### `course_progression`

A CSV-driven course progression checker.

It compares completed and in-progress courses from a transcript CSV against course requirement data, then prints a simple report showing which requirement areas are complete or incomplete.

The checker includes `IP` courses in projected progress, but not completed progress.

## Repository structure

```text
uni_utils/
├── course_progression/
│   ├── data/
│   ├── src/
│   ├── README.md
│   └── package.json
├── gpa_insights/
│   ├── index.js
│   ├── README.md
│   └── package.json
└── README.md
```

## Setup

Each utility is its own small Node.js project.

Go into the project you want to use:

```bash
cd course_progression
```

Install dependencies:

```bash
npm install
```

Run the script:

```bash
npm run check
```

or, depending on the project:

```bash
node index.js
```
## Disclaimer

These tools are personal planning utilities only. Please **do not** use them as a source of truth for official degree progression, GPA, graduation eligibility, or program advice.

If you need an official progression check, apply for one through UQ or contact the relevant UQ student administration team.

## Notes

The scripts are intentionally simple and CSV-based so that the data can be edited without changing much code.

Future improvements could include:

* better transcript parsing
* clearer reports
* tests for requirement logic
* support for multiple programs or plans
* a small web interface
