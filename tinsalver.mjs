#!/usr/bin/env node

import { parseStringPromise } from 'xml2js';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

async function* crawl(url) {
    let resp = await fetch(url);
    const xml = await parseStringPromise(await resp.text());

    for (let item of xml?.content?.data[0]['content-item']) {
        if (item['leaf'][0] == 'true') {
            yield item;
        } else {
            yield* crawl(item['resourceURI'][0]);
        }
    }
}

await yargs(hideBin(process.argv))
    .option('user', {
        alias: 'u',
        type: 'string',
        required: true,
        description: 'Sonatype user or token id',
    })
    .option('password', {
        alias: 'p',
        type: 'string',
        required: true,
        description: 'Sonatype password or token id',
    })
    .command({
        command: 'sign <stagedRepoId>',
        handler: async ({ stagedRepoId, user, password }) => {
            const stagingURL = `https://oss.sonatype.org/service/local/repositories/${stagedRepoId}/content/`;

            for await (let {
                resourceURI: [url],
                text: [text],
            } of crawl(stagingURL)) {
                if (text.startsWith('maven-metadata.xml')) {
                    continue;
                }

                const ext = text.split('.').slice(-1)[0];
                if (['asc', 'sha1', 'sha256', 'sha512'].includes(ext)) {
                    continue;
                }
                console.log(url);

                const fileBody = await (await fetch(url)).buffer();

                const signature = await new Promise((resolve, reject) => {
                    try {
                        const proc = exec(`keybase pgp sign --detached -i -`, (err, stdout, stderr) => {
                            console.log(stderr);
                            if (err) {
                                reject(err);
                            } else {
                                resolve(stdout);
                            }
                        });
                        proc.stdin.write(fileBody);
                        proc.stdin.end();
                    } catch (err) {
                        reject(err);
                    }
                });

                console.log(signature);

                const resp = await fetch(`${url}.asc`, {
                    method: 'PUT',
                    body: signature,
                    headers: {
                        Authorization: 'Basic ' + Buffer.from(`${user}:${password}`).toString('base64'),
                    },
                });
                if (resp.status != 201) {
                    throw `${resp.statusText} ${resp.status}`;
                }
                console.log(await resp.text());
            }
        },
    }).argv;
