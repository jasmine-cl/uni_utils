# GPA Insights

A small Node.js script for calculating a weighted GPA from a transcript CSV.

The script reads `transcript.csv`, ignores withdrawn courses marked with `W`, and calculates GPA using:

```text
sum(grade × unit value) / sum(unit value)
```

## Setup

Install dependencies:

```bash
npm install
```

## Transcript format

Create a `transcript.csv` file in the project root.

Example:

```csv
course,grade,unitValue
CSSE1001,6,2
COMP2048,5,2
MATH1051,W,2
```

Required columns:

```text
grade
unitValue
```

## Run

```bash
node index.js
```

The calculated GPA will be printed to the terminal.

## Notes

This is a personal planning tool only. Please do not use it as an official source of truth.

For official grade and GPA information, refer to UQ guidance or request official advice through UQ.
