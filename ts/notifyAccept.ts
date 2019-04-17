import * as csvParse from 'csv-parse/lib/sync';
import * as fs from 'fs';
import * as cp from 'child_process';
var sleep = require('system-sleep');

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
${row.Class} (Fall 2019). We will contact you later this semester with hiring
paperwork, information on orientation, and so on.

You are also invited the UCA End of Semester celebration (free dinner), on
Thursday at 7PM (this week). We hope you can attend. Please RSVP here:

https://forms.gle/b26VD4kiUQQvYpWeA

Let us know if you have any questions.

Best,

Arjun and Joydeep
UCA Program Directors

P.S. Sorry if this is a duplicate message.
`;
        const child = cp.spawnSync('mail', [ '-s',
            `UCA Application: acceptance notification`,
            '-c', 'arjun@cs.umass.edu',
            '-c', 'joydeepb@cs.umass.edu',
            '-c', 'tszkeiserena@umass.edu',
            '-c', 'eearl@umass.edu',
            row.Email ], {
                input: body,
                stdio: [ 'pipe', 'inherit', 'inherit' ],
        });

        if (child.status !== 0) {
            console.log(`error, ${row.Email}`);
        }
        console.log(`ok, ${row.Email}`);
        sleep(1000);
    }
}

main().catch(reason => console.log(reason));