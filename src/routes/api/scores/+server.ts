import { json } from '@sveltejs/kit';
import { addScore } from '$lib/server/db/scores';
import { readJSON } from '$lib/server/io';

export async function GET() {
    const data = await readJSON('scores');
    return json(data);
}

export async function POST({ request }) {
    const payload = await request.json();

    await addScore(payload.score);

    return new Response();
}