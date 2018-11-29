import * as fs from 'fs';
import { fail, expectNumber } from './util';
import { List, Map, Set } from 'immutable';
import * as students from './students';
import { matchingWithCapacity } from './galeShapely';
const convertArrayToCsv = require('convert-array-to-csv').default;

const xlsx = require('node-xlsx').default;

// Type of value produced by xlsx.parse(filename)
type Worksheets = { data: (string | number)[][] }[];

const expectedInstructorHeader = List.of(
    'Class',
    'Choice',
    'Name',
    'Taken?',
    'Grade in class',
    'GPA',
    'Major GPA',
    'UCA in past year',
    'Candidate comments',
    'Faculty rank');

function parseChoice(choice: any, message: string): number {
    switch (choice) {
        case '1st choice': return 1;
        case '2nd choice': return 2;
        case '3rd choice': return 3;
        case '4th choice': return 4;
        case '5th choice': return 5;
        default: return fail(`${message}: choice is ${choice}`);
    }
}

function parseTaken(taken: any): string {
    // TODO(arjun): Factor in taken
    return taken;
}

interface Preference {
    course: string;
    student: number;
    taken: string;
    grade: string;
    studentRank: number;
    facultyRank: number;
}

type Count = { course: string, count: number };

function fudgeRank(taken: any, grade: any) {
    if (taken && taken.includes('not taken')) {
        return 99;
    }
    else if (taken && taken.includes('currently taking')) {
        return 75;
    }
    else {
        if (grade === undefined) {
            return 70;
        }
        else if (grade.includes('A')) {
            return 50;
        }
        else if (grade.includes('B')) {
            return 60;
        }
        else {
            return 100;
        }
    }
}

function parseInstructorPreferenceSheet(xlsxPath: string) {
    const worksheets = xlsx.parse(xlsxPath) as Worksheets;
    if (worksheets.length !== 1) {
        return fail(`${xlsxPath} has multiple worksheets. Not expected`);
    }

    const rows = worksheets[0].data;
    if (rows.length < 1) {
        return fail(`${xlsxPath} is an empty sheet`);
    }
    if (List(rows[0]).equals(expectedInstructorHeader) === false) {
        return fail(`${xlsxPath} has the wrong header`);
    }

    rows.shift(); // drop the header
    const parsedRows = rows.map((row, index) => {
        const rank = row[9];
        // +2, because we dropped the header and zero-indexing
        const message = `Row ${index + 2} in ${xlsxPath}`;
        if (row.length === 0) {
            return false;
        }
        const student = students.get(row[2] as string,
            expectNumber(row[5], message),
            expectNumber(row[6], message),
            message);
        if (student === undefined) {
            // Students sometimes delete themselves from the pool. E.g., Serena.
            console.log(`${message}: could not find applicant ${row[2]}. Ignoring`);
            return false;
        }
        return {
            course: row[0] as string,
            student: student.spireID,
            studentRank: parseChoice(row[1], message),
            taken: parseTaken(row[3]),
            grade: row[4],
            facultyRank: typeof rank === 'undefined' ? fudgeRank(row[3], row[4]) : expectNumber(rank, message)
        }
    });
    // We do not filter first, so that the indices are correct.
    return List(parsedRows.filter(row => row !== false) as Preference[]);
}

function parseCourseSummarySheet(xlsxPath: string) {
    const worksheets = xlsx.parse(xlsxPath) as Worksheets;
    if (worksheets.length !== 1) {
        return fail(`${xlsxPath} has multiple worksheets.`);
    }

    const rows = worksheets[0].data;
    rows.shift(); // drop the header;
    return Map(rows
        .filter(row => row.length > 2)
        .map(row => {
            let count = Number(row[3]);
            if (isFinite(count) === false) {
                count = 0;
            }
            return [ row[0], count ] as [ string, number ];
        }));
}

function getCourseRanks(course: string, prefs: List<Preference>) {
    return prefs.filter(p => p.course === course)
        .map(p => ({ rank: p.facultyRank, spireID: p.student }))
        .sortBy(p => p.rank)
        .map(p => p.spireID);
}

function getStudentRanks(spireID: number, prefs: List<Preference>) {
    return prefs.filter(p => p.student === spireID)
        .map(p => ({ rank: p.studentRank, course: p.course }))
        .sortBy(p => p.rank)
        .map(p => p.course);
}

function matching(capacities: Map<string, number>, prefs: List<Preference>) {
    const courses = List(capacities.keys());
    const allStudents = students.all().map(s => s.spireID);


    const coursePrefs = Map(courses
        .map(c => [c, getCourseRanks(c, prefs)] as [string, List<number>]));
    const studentPrefs = Map(allStudents
        .map(s => [s, getStudentRanks(s, prefs)] as [ number, List<string>]));
    const matching = matchingWithCapacity(courses, allStudents, coursePrefs,
        studentPrefs, capacities);

    return matching;
}

function displayMatching(prefs: List<Preference>,
    matching: Map<number, string>) {
    return matching
        .entrySeq()
        .map(([spireID, course]) => {
            const student = students.all().find(s => s.spireID === spireID);
            if (student === undefined) {
                // This is essentially impossible at this point.
                return fail(`displayMatching: no student with ID ${spireID}`);
            }
            const pref = prefs.find(pref => pref.student === spireID && pref.course == course);
            if (pref === undefined) {
                return fail(`Did not select course!`);
            }
            return [ course, student.firstName + student.lastName,
                student.email, pref.studentRank, pref.facultyRank,
                pref.taken, pref.grade,
                student.gpa, student.majorGPA ];
            })
            .toArray();
}


export function main() {
    students.parse('/Users/arjun/Downloads/students.csv');
    const capacities = parseCourseSummarySheet('//Users/arjun/Downloads/counts.xlsx');
    const p = '/Users/arjun/Downloads/sheets/';
    const prefs = List(fs.readdirSync(p))
        .filter(p => p.endsWith('.xlsx'))
        .filter(p => p.startsWith('~$') === false)
        .flatMap(path => parseInstructorPreferenceSheet(`${p}/${path}`));
    (global as any).prefsAll = prefs;

    console.log(convertArrayToCsv(displayMatching(prefs, matching(capacities, prefs))));

}

console.log(main());