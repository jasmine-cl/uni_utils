import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { parse } from "csv-parse/sync";

const paths = {
  requirements: "data/requirements.csv",
  aliases: "data/aliases.csv",
  courses: "data/courses.csv",
  courseGroups: "data/course_groups.csv",
  transcript: "data/transcript.csv",

  reportsDir: "reports",
  markdownReport: "reports/progression_report.md",
};

function readCsv(path) {
  return parse(readFileSync(path, "utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function splitIds(value) {
  return String(value ?? "")
    .split("|")
    .map((id) => id.trim())
    .filter(Boolean);
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getGrade(record) {
  return String(record.grade ?? record.Grade ?? "").trim().toUpperCase();
}

function getCourseCode(record) {
  return (
    record.course_code ??
    record.courseCode ??
    record.code ??
    record.Course ??
    record["Course Code"] ??
    ""
  ).trim();
}

function getTranscriptUnits(record, courseMap) {
  const raw =
    record.unitValue ??
    record.units ??
    record.Units ??
    record["Unit Value"];

  const parsed = numberOrNull(raw);

  if (parsed !== null) {
    return parsed;
  }

  const code = getCourseCode(record);
  return courseMap.get(code)?.units ?? 2;
}

function getCourseState(record) {
  const grade = getGrade(record);

  if (grade === "" || grade === "W" || grade === "INC") {
    return null;
  }

  if (grade === "IP") {
    return "in_progress";
  }

  const numeric = Number(grade);

  if (Number.isFinite(numeric)) {
    return numeric >= 4 ? "completed" : null;
  }

  if (["P", "PASS", "CP", "CR", "D", "HD"].includes(grade)) {
    return "completed";
  }

  return null;
}

function inferLevel(courseCode) {
  const digits = String(courseCode).match(/\d/);
  return digits ? Number(digits[0]) : null;
}

function icon(status) {
  return status === "complete" ? "✅" : "❌";
}

function formatMax(max) {
  return max === null ? "∞" : max;
}

function formatCourse(course) {
  if (course.grade === "IP") {
    return `${course.code} (IP)`;
  }

  return course.code;
}

function formatCourses(courses) {
  return courses.length > 0 ? courses.map(formatCourse).join(", ") : "-";
}

function formatMissing(missing) {
  return missing.length > 0 ? missing.join(", ") : "-";
}

function statusFor(completedUnits, projectedUnits, min, max, missingCount = 0) {
  if (max !== null && projectedUnits > max) {
    return "over";
  }

  if (missingCount > 0) {
    return "incomplete";
  }

  if (min !== null && completedUnits < min) {
    return "incomplete";
  }

  return "complete";
}

function buildReportText({ transcriptPath, results, unused }) {
  const lines = [];

  lines.push("# Course Progression Report");
  lines.push("");
  lines.push(`Generated from: ${transcriptPath}`);
  lines.push("");
  lines.push("Note: IP courses are included in projected progress, but not completed progress.");
  lines.push("");

  for (const result of results) {
    const maxText = formatMax(result.max);

    lines.push(`${icon(result.status)} ${result.requirement_id}`);
    lines.push(`   status: ${result.status}`);
    lines.push(`   completed: ${result.completed_units} / ${result.min ?? 0}-${maxText}`);
    lines.push(`   projected: ${result.projected_units} / ${result.min ?? 0}-${maxText}`);

    if (result.counted_courses.length > 0) {
      lines.push(`   counted: ${formatCourses(result.counted_courses)}`);
    }

    if (result.missing.length > 0) {
      lines.push(`   missing: ${formatMissing(result.missing)}`);
    }

    lines.push("");
  }

  if (unused.length > 0) {
    lines.push("Unused countable courses:");

    for (const course of unused) {
      lines.push(`- ${formatCourse(course)} (${course.units} units)`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function writeMarkdownReport(path, reportText) {
  writeFileSync(path, reportText, "utf8");
}

const requirements = readCsv(paths.requirements);
const aliases = readCsv(paths.aliases);
const courses = readCsv(paths.courses);
const courseGroups = readCsv(paths.courseGroups);
const transcript = readCsv(paths.transcript);

mkdirSync(paths.reportsDir, { recursive: true });

const courseMap = new Map(
  courses.map((course) => [
    course.course_code,
    {
      ...course,
      units: Number(course.units),
      level: Number(course.level || inferLevel(course.course_code)),
    },
  ])
);

const aliasMap = new Map(
  aliases.map((alias) => [
    alias.alias_id,
    {
      courseIds: splitIds(alias.course_ids),
      min: numberOrNull(alias.min) ?? 0,
      max: numberOrNull(alias.max) ?? Infinity,
    },
  ])
);

const groupMap = new Map();

for (const row of courseGroups) {
  if (!groupMap.has(row.group_id)) {
    groupMap.set(row.group_id, new Set());
  }

  groupMap.get(row.group_id).add(row.course_code);
}

const countable = transcript
  .map((record) => {
    const state = getCourseState(record);

    if (state === null) {
      return null;
    }

    const code = getCourseCode(record);
    const courseInfo = courseMap.get(code);

    return {
      code,
      title: record.title ?? record.Title ?? courseInfo?.title ?? "",
      units: getTranscriptUnits(record, courseMap),
      level: courseInfo?.level ?? inferLevel(code),
      grade: getGrade(record),
      state,
      raw: record,
    };
  })
  .filter(Boolean)
  .filter((course) => course.code);

const countableByCode = new Map(countable.map((course) => [course.code, course]));
const usedCodes = new Set();

function availableCourses() {
  return countable.filter((course) => !usedCodes.has(course.code));
}

function claimCourse(code, reason) {
  if (usedCodes.has(code)) {
    return null;
  }

  const course = countableByCode.get(code);

  if (!course) {
    return null;
  }

  usedCodes.add(code);

  return {
    code,
    title: course.title,
    units: course.units,
    level: course.level,
    grade: course.grade,
    state: course.state,
    reason,
  };
}

function checkDirectRequirement(requirement) {
  const tokens = splitIds(requirement.course_ids);
  const claimed = [];
  const missing = [];

  for (const token of tokens) {
    if (aliasMap.has(token)) {
      const alias = aliasMap.get(token);
      const aliasClaimed = [];

      for (const code of alias.courseIds) {
        const claimedCourse = claimCourse(code, token);

        if (claimedCourse) {
          aliasClaimed.push(claimedCourse);
        }

        const units = aliasClaimed.reduce(
          (sum, course) => sum + course.units,
          0
        );

        if (units >= alias.min) {
          break;
        }
      }

      const aliasUnits = aliasClaimed.reduce(
        (sum, course) => sum + course.units,
        0
      );

      if (aliasUnits < alias.min) {
        missing.push(token);
      }

      claimed.push(...aliasClaimed);
      continue;
    }

    const claimedCourse = claimCourse(token, requirement.requirement_id);

    if (claimedCourse) {
      claimed.push(claimedCourse);
    } else {
      missing.push(token);
    }
  }

  return buildResult(requirement, claimed, missing);
}

function checkGroupRequirement(requirement) {
  const groupId = requirement.course_ids;
  const min = numberOrNull(requirement.min) ?? 0;
  const max = numberOrNull(requirement.max) ?? Infinity;

  let eligible;

  if (groupId === "GENERAL_ELECTIVE") {
    eligible = availableCourses();
  } else {
    const allowed = groupMap.get(groupId) ?? new Set();
    eligible = availableCourses().filter((course) => allowed.has(course.code));
  }

  const claimed = [];
  let claimedUnits = 0;

  for (const course of eligible) {
    if (claimedUnits >= max) {
      break;
    }

    const nextUnits = claimedUnits + course.units;

    if (nextUnits > max) {
      continue;
    }

    usedCodes.add(course.code);

    claimed.push({
      code: course.code,
      title: course.title,
      units: course.units,
      level: course.level,
      grade: course.grade,
      state: course.state,
      reason: groupId,
    });

    claimedUnits = nextUnits;
  }

  const missing = claimedUnits < min ? [`${min - claimedUnits} units`] : [];
  return buildResult(requirement, claimed, missing);
}

function checkTotalProgram(requirement, assignedCourses) {
  const min = numberOrNull(requirement.min);
  const max = numberOrNull(requirement.max);

  const completedUnits = assignedCourses
    .filter((course) => course.state === "completed")
    .reduce((sum, course) => sum + course.units, 0);

  const inProgressUnits = assignedCourses
    .filter((course) => course.state === "in_progress")
    .reduce((sum, course) => sum + course.units, 0);

  const projectedUnits = completedUnits + inProgressUnits;

  return {
    requirement_id: requirement.requirement_id,
    completed_units: completedUnits,
    in_progress_units: inProgressUnits,
    projected_units: projectedUnits,
    min,
    max,
    status: statusFor(completedUnits, projectedUnits, min, max),
    counted_courses: assignedCourses,
    missing: projectedUnits < min ? [`${min - projectedUnits} units`] : [],
  };
}

function checkLevelRequirement(requirement, assignedCourses) {
  const min = numberOrNull(requirement.min);
  const max = numberOrNull(requirement.max);

  const predicate =
    requirement.requirement_id === "level_3_or_higher"
      ? (course) => course.level >= 3
      : requirement.requirement_id === "level_1_max"
        ? (course) => course.level === 1
        : () => false;

  const counted = assignedCourses.filter(predicate);

  const completedUnits = counted
    .filter((course) => course.state === "completed")
    .reduce((sum, course) => sum + course.units, 0);

  const inProgressUnits = counted
    .filter((course) => course.state === "in_progress")
    .reduce((sum, course) => sum + course.units, 0);

  const projectedUnits = completedUnits + inProgressUnits;

  return {
    requirement_id: requirement.requirement_id,
    completed_units: completedUnits,
    in_progress_units: inProgressUnits,
    projected_units: projectedUnits,
    min,
    max,
    status: statusFor(completedUnits, projectedUnits, min, max),
    counted_courses: counted,
    missing:
      min !== null && projectedUnits < min
        ? [`${min - projectedUnits} units`]
        : [],
  };
}

function buildResult(requirement, claimed, missing) {
  const min = numberOrNull(requirement.min);
  const max = numberOrNull(requirement.max);

  const completedUnits = claimed
    .filter((course) => course.state === "completed")
    .reduce((sum, course) => sum + course.units, 0);

  const inProgressUnits = claimed
    .filter((course) => course.state === "in_progress")
    .reduce((sum, course) => sum + course.units, 0);

  const projectedUnits = completedUnits + inProgressUnits;

  return {
    requirement_id: requirement.requirement_id,
    completed_units: completedUnits,
    in_progress_units: inProgressUnits,
    projected_units: projectedUnits,
    min,
    max,
    status: statusFor(
      completedUnits,
      projectedUnits,
      min,
      max,
      missing.length
    ),
    counted_courses: claimed,
    missing,
  };
}

const directRequirementIds = new Set(["core", "plan"]);

const groupRequirementIds = new Set([
  "breadth_elective",
  "program_elective",
  "general_elective",
]);

const results = [];

for (const requirement of requirements) {
  if (directRequirementIds.has(requirement.requirement_id)) {
    results.push(checkDirectRequirement(requirement));
  }

  if (groupRequirementIds.has(requirement.requirement_id)) {
    results.push(checkGroupRequirement(requirement));
  }
}

const assignedCourses = countable.filter((course) => usedCodes.has(course.code));

for (const requirement of requirements) {
  if (requirement.requirement_id === "total_program") {
    results.push(checkTotalProgram(requirement, assignedCourses));
  }

  if (
    requirement.requirement_id === "level_3_or_higher" ||
    requirement.requirement_id === "level_1_max"
  ) {
    results.push(checkLevelRequirement(requirement, assignedCourses));
  }
}

const unused = countable.filter((course) => !usedCodes.has(course.code));

const reportText = buildReportText({
  transcriptPath: paths.transcript,
  results,
  unused,
});

console.log(reportText);

writeMarkdownReport(paths.markdownReport, reportText);

console.log(`Saved ${paths.markdownReport}`);