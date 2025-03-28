<script lang="ts">
	const { data } = $props();
	const { scores } = $derived(data);
	const availableGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	const genFilter = $state<{ [key: string]: boolean }>({
		'1': true,
		'2': false,
		'3': false,
		'4': false,
		'5': false,
		'6': false,
		'7': false,
		'8': false,
		'9': false
	});
	const filteredScores = $derived.by(() => {
		let checkedGens = [];
		for (const g in genFilter) {
			if (genFilter[g]) checkedGens.push(g);
		}

		return scores
			.filter((s) => s.selectedGens.join('') === checkedGens.join(''))
			.sort((a, b) => +a.time.replace(':', '') - +b.time.replace(':', ''))
			.slice(0, 5);
	});

	function handleGenFilter(num: number) {
		genFilter[num] = !genFilter[num];
	}
</script>

<div class="intro">
	<h1>Score</h1>
	<p>
		Ici vous pouvez consulter vos performances pour ce qui est de trouver le nom des Pokémons sous
		le pression d'un chronomètre
	</p>
</div>

<div class="gen-select">
	<legend
		>Commencer par sélectionner un combo de générations pour lesquels vous souhaitez voir votre
		temps :</legend
	>
	<div>
		{#each availableGens as num}
			<label for="gen{num}">
				{num}
				<input
					type="checkbox"
					id="gen{num}"
					bind:checked={genFilter[num.toString()]}
					oninput={() => handleGenFilter(num)}
				/>
			</label>
		{/each}
	</div>
</div>

<ol>
	{#each filteredScores as { time }, index}
		<li>{index + 1}. {time}</li>
	{/each}
</ol>

<style>
	.intro {
		margin: 2rem;

		& p {
			margin-top: 1rem;
		}
	}

	ol {
		margin-inline: 2rem;
	}

	li {
		font-size: 1.5rem;
		font-family: var(--secondary-font);
		margin-bottom: 0.5rem;
		&:first-of-type {
			font-weight: 700;
			color: var(--main-color);
		}
		&:nth-of-type(2) {
			font-weight: 600;
		}
		&:nth-of-type(3) {
			font-weight: 500;
		}
	}

	.gen-select input {
		appearance: none;
		-webkit-appearance: none;
		background-color: transparent;
		width: 10px;
		height: 10px;
	}
	.gen-select {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 2rem;
	}
	.gen-select > div {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		max-width: 500px;
	}
	.gen-select label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--secondary-font);
	}
	.gen-select input[type='checkbox'] {
		cursor: pointer;
		width: 15px;
		height: 15px;
		border: 3px solid var(--font-color);
	}
	.gen-select input:checked {
		display: grid;
		place-content: center;
	}
	.gen-select input[type='checkbox']::before {
		content: '';
		transform: scale(0);
		height: 7px;
		width: 7px;
		background-color: var(--font-color);
		transition: 0.1s transform ease-in-out;
	}
	.gen-select input[type='checkbox']:checked::before {
		transform: scale(1);
	}
</style>
