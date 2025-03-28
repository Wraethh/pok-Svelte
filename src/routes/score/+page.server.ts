import { readScores } from '$lib/server/db/scores.js';

export async function load() {
    const scores = await readScores();

    return { scores };
}