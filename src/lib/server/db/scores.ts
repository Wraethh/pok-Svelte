import { writeJSON, readJSON } from '$lib/server/io';

export function readScores() {
	return readJSON('scores').catch(() => []) as Promise<{ time: string, selectedGens: string[] }[]>;
}
export async function addScore(score: { time: string, selectedGens: string[] }) {
	const scores = await readScores();
	scores.push(score);
	return writeJSON('scores', scores);
}