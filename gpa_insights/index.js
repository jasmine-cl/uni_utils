import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const csv = readFileSync('transcript.csv', 'utf8');

const records = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  trim: true
});

// https://my.uq.edu.au/information-and-services/manage-my-program/exams-and-assessment/final-grades

const calcGPA = (records) => {
    const active = records.filter((record) => record.grade != 'W');
    const sumGP  = active.reduce((acc, curr) => acc + Number(curr.grade * curr.unitValue), 0);
    const sumP   = active.reduce((acc, curr) => acc + Number(curr.unitValue), 0);
    return sumGP / sumP;
}

console.log(calcGPA(records));