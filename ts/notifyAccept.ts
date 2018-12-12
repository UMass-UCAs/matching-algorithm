import * as csvParse from 'csv-parse/lib/sync';
import * as fs from 'fs';
import * as cp from 'child_process';

type Row = {
    Class: string,
    Name: string,
    Email: string
};

async function main() {
    const file = process.argv[2];
    const csv = fs.readFileSync(file, { encoding: 'utf8' });
    const rows = csvParse(csv, {columns: true }) as Row[];
    for (const row of rows) {
        const body = `Dear ${row.Name},

We are delighted to inform you that you have been selected as a UCA for
${row.Class} (Spring 2019). We will contact you later this semester with hiring
paperwork, information on orientation, and so on.

You are also invited the UCA End of Semester celebration (free dinner), on
Monday at 7PM. We hope you can attend. Please RSVP here:

https://docs.google.com/a/cs.umass.edu/forms/d/1pF57MmIJHAHRnKbD7ZV1EIe_8juF8KyVaRgSKDOpr3o

Let us know if you have any questions.

Best,

Arjun and Joydeep
UCA Program Directors

P.S. Sorry if this is a duplicate message.
`;
        const child = cp.spawnSync('mail', [ '-s',
            `UCA Application: acceptance notification`,
            '-c', 'joydeepb@cs.umass.edu',
            '-c', 'tszkeiserena@umass.edu',
            '-c', 'eearl@umass.edu',
            row.Email ], {
                input: body,
                stdio: [ 'pipe', 'inherit', 'inherit' ],
        });
        if (child.status !== 0) {
            console.log(row.Email);
        }
    }
}

main().catch(reason => console.log(reason));