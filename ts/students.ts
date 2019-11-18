/**
 * Unfortunately, the sheets that we sent to instructors do not have SPIRE IDs.
 * This module loads a list of students and exports a 'get' function that
 * returns an object with a Spire ID based on the information that we have
 * in the instructor sheets.
 */
import * as fs from 'fs';
import * as csvParse from 'csv-parse/lib/sync';
import { fail, expectNumber } from './util';
import { List } from 'immutable';

export interface Student {
    firstName: string,
    lastName: string,
    spireID: number,
    email: string,
    majorGPA: any,
    gpa: any
}

let students: Student[] = [];

export function parse(path: string) {
    const rows: string[][] = csvParse(fs.readFileSync(path, {
        encoding: 'utf-8' }));
    rows.shift();
    students = rows.map((row, index) => {
        const message = `Row ${index + 1}`;
        return {
            firstName: row[2].trim(),
            lastName: row[3].trim(),
            spireID: expectNumber(row[4], message + ' (expected SpireID in column 5)'),
            email: row[5],
            gpa: expectNumber(row[7], message  + ' (expected GPA in column 7)'),
            majorGPA: expectNumber(row[8], message + ' (expected Major GPA in column 8)')
        }
    });
}

export function get(name: string, gpa: number, majorGPA: number,
    message: string): Student | undefined {
    const student = students.find(s => {
        if (name.includes(s.firstName) && name.includes(s.lastName)) {
            if (s.gpa === gpa && s.majorGPA === majorGPA) {
                return true;
            }
            else {
                console.log(`Found ${name} but with ${s.gpa} ${s.majorGPA} instead of ${gpa} ${majorGPA}`);
                return false;
            }
        }
        return false;
    });
    return student;
}

export function all() {
    return List(students);
}