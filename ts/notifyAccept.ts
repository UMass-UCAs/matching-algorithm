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
${row.Class} (Spring 2020). We will contact you shortly with hiring
paperwork, information on orientation, and so on.

Let us know if you have any questions.

Best,

Arjun and Emma
UCA Program Directors

P.S. Sorry if this is a duplicate message.
`;
        const child = cp.spawnSync('mail', [ '-s',
            `UCA Application: acceptance notification`,
            '-c', 'arjun@cs.umass.edu',
            '-c', 'emmaanderson@cs.umass.edu',
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
