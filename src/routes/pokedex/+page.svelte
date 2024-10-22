<script lang="ts">
	import { onMount } from 'svelte';

	interface Pokemon {
		pokedex_id: number;
		generation: number;
		category: string;
		name: {
			fr: string;
			en: string;
			jp: string;
		};
		sprites: {
			regular: string;
			shiny: string;
			gmax: {
				regular: string;
				shiny: string;
			} | null;
		};
		types: {
			name: string;
			image: string;
		}[];
		talents: {
			name: string;
			tc: boolean;
		}[];
		stats: {
			atk: number;
			def: number;
			hp: number;
			spe_atk: number;
			spe_def: number;
			vit: number;
		};
		resistances: {
			name: string;
			multiplier: number;
		}[];
		evolution: {
			pre:
				| {
						pokedex_id: number;
						name: string;
						condition: string;
				  }[]
				| null;
			next:
				| {
						pokedex_id: number;
						name: string;
						condition: string;
				  }[]
				| null;
			mega:
				| {
						orbe: string;
						sprites: {
							regular: string;
							shiny: string;
						};
				  }[]
				| null;
		};
		height: string;
		weight: string;
		egg_groups: string[];
		sexe: { male: number; female: number };
		catch_rate: number;
		level_100: number;
		formes:
			| {
					region: string;
					name: {
						fr: string;
						en: string;
						jp: string;
					};
			  }[]
			| null;
	}

	interface Value {
		id: number;
		answer: string;
		found: boolean;
	}

	const { data } = $props<{ data: { pokemons: Pokemon[] } }>();
	let pokemons = $state(data.pokemons);
	let params = $state({ shuffleMod: false, lang: 'fr' });
	let timer = $state({
		isReadyToStart: false,
		isOperating: false,
		isPaused: false,
		elapsedTime: '',
		previousTime: '00:00'
	});
	/* Initialise un tableau d'objets pour stocker les réponses */
	const getValues = () => {
		return pokemons.map((pkmn: Pokemon) => ({ id: pkmn.pokedex_id, answer: '', found: false }));
	};
	let values = $state(getValues());
	function isItShiny(): boolean {
		return Math.ceil(Math.random() * 8192) === 1 ? true : false;
	}

	/* Charge les données depuis le localStorage */
	function loadItems(): void {
		const localStorageItems = {
			savedAnswers: localStorage.getItem('pokemonAnswers'),
			shuffledPokemons: localStorage.getItem('shuffledPokemons'),
			shuffleGameMod: localStorage.getItem('shuffleGameMod'),
			gameLang: localStorage.getItem('gameLang'),
			timer: localStorage.getItem('timer')
		};

		if (localStorageItems.savedAnswers) values = JSON.parse(localStorageItems.savedAnswers);
		if (localStorageItems.shuffleGameMod)
			params.shuffleMod = JSON.parse(localStorageItems.shuffleGameMod);
		if (localStorageItems.shuffleGameMod && localStorageItems.shuffledPokemons) {
			pokemons = JSON.parse(localStorageItems.shuffledPokemons);
		}
		if (localStorageItems.gameLang) params.lang = localStorageItems.gameLang;
		if (localStorageItems.timer) {
			timer = JSON.parse(localStorageItems.timer);
			localStorage.removeItem('timer');
		}
	}

	function validateAnswer(value: string, index: number): void {
		/* S'assure que la valeur ne contient que des characères nécessaires
		Accents et charactères spé. présents dans les noms de pokémons français : âçéÉêèïô-:\s\.♀♂ */
		const cleanValue = (str: string): string => str.normalize('NFD').replace(/[^a-z\s\.]/gi, '');
		/* Met une majuscule à tous les mots */
		values[index].answer = cleanValue(value)
			.split(' ')
			.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
			.join(' ');
		/* Détecte si la réponse est juste */
		const pokemon = pokemons.find((pkmn: Pokemon) => pkmn.pokedex_id === index + 1);
		if (values[index].answer === cleanValue(pokemon.name[params.lang])) {
			values[index] = { ...values[index], answer: pokemon.name[params.lang], found: true };
			localStorage.setItem('pokemonAnswers', JSON.stringify(values));
		}
		if (runTimer && values.every((el: Value) => el.found)) {
			stopTimer(); // Stop le timer si toutes les réponses sont trouvées
		}
	}

	function shufflePokemons(): void {
		const result: Pokemon[] = [];

		pokemons.forEach((pkmn: Pokemon) => {
			const getRandomPkmnId = (): number => {
				// On utilise la récursivité pour trouver un id de pokemon qui ne soit pas déjà présent dans le tableau
				const randomNum = Math.floor(Math.random() * pokemons.length) + 1;
				if (result.length !== 0 && result.some((el: Pokemon) => el?.pokedex_id === randomNum)) {
					return getRandomPkmnId();
				}
				return randomNum;
			};
			const randomPkmnId = getRandomPkmnId();
			const randomPokemon = pokemons.find((el: Pokemon) => el.pokedex_id === randomPkmnId);
			result.push(randomPokemon);
		});

		pokemons = result;
		localStorage.setItem('shuffledPokemons', JSON.stringify(pokemons));
	}

	function changeMod(): void {
		params.shuffleMod = !params.shuffleMod;
		if (params.shuffleMod) {
			localStorage.setItem('shuffleGameMod', JSON.stringify(true));
			shufflePokemons();
		} else {
			localStorage.removeItem('shuffleGameMod');
			localStorage.removeItem('shuffledPokemons');
			pokemons = pokemons.sort((a: Pokemon, b: Pokemon) => a.pokedex_id - b.pokedex_id);
		}
	}

	function changeLang() {
		params.lang = params.lang === 'fr' ? 'en' : 'fr';
		values = values.map((el: Value) => {
			if (el.found) {
				return {
					...el,
					answer: pokemons.find((pkmn: Pokemon) => pkmn.pokedex_id === el.id).name[params.lang]
				};
			} else return el;
		});
		localStorage.setItem('gameLang', params.lang);
	}

	function startTimer() {
		if (!timer.isPaused) timer = { ...timer, isReadyToStart: true, elapsedTime: '00:00' };
		else {
			timer = { ...timer, isOperating: true, isPaused: false };
			manageTimer();
		}
	}
	function pauseTimer() {
		timer = {
			...timer,
			isOperating: false,
			isPaused: true,
			previousTime: timer.elapsedTime
		};
		manageTimer();
	}
	function stopTimer() {
		timer = {
			...timer,
			isReadyToStart: false,
			isOperating: false,
			isPaused: false
		};
		manageTimer();
	}

	let runTimer: number | undefined;
	function manageTimer() {
		if (timer.isOperating) {
			const start = Date.now();
			runTimer = setInterval(() => {
				const delta = Date.now() - start; // milliseconds elapsed since start
				const time = new Date(
					Date.UTC(
						0,
						0,
						0,
						0,
						+timer.previousTime.slice(-5, -3),
						+timer.previousTime.slice(-2),
						delta
					)
				);
				const seconds = time.getUTCSeconds();
				const minutes = time.getUTCMinutes();
				timer.elapsedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
			}, 1000);
		} else {
			clearInterval(runTimer);
			runTimer = undefined;
		}
	}

	/* Réinitialise le jeu */
	function reset(): void {
		values = pokemons.map((pkmn: Pokemon) => ({ id: pkmn.pokedex_id, answer: '', found: false }));
		localStorage.removeItem('pokemonAnswers');
	}

	function drag(e: MouseEvent): void {
		e.preventDefault();
		const dragBox = e.target as HTMLElement;

		document.onmousemove = (e) => {
			e.preventDefault();
			const newLeft = dragBox.offsetLeft + e.movementX;
			const minLeft = dragBox.offsetWidth / 2;
			const maxLeft = window.innerWidth - dragBox.offsetWidth / 2;
			// Limite la position à l'intérieur de l'écran
			if (newLeft >= minLeft && newLeft <= maxLeft) {
				dragBox.style.left = `${newLeft}px`;
			}
		};

		document.onmouseup = () => {
			document.onmouseup = null;
			document.onmousemove = null;
		};
	}

	onMount(() => {
		loadItems(); // Charge les éléments du localStorage au montage du composant
		values = values.map((el: Value) => {
			if (el.found) {
				return {
					...el,
					answer: pokemons.find((pkmn: Pokemon) => pkmn.pokedex_id === el.id).name[params.lang]
				};
			} else return el;
		});
		return () => {
			if (runTimer) {
				pauseTimer();
				localStorage.setItem('timer', JSON.stringify(timer));
			} // Met en pause le timer au démontage s'il est actif
		};
	});
</script>

<h1>Podédex</h1>

<div class="hud" role="button" tabindex={0} onmousedown={(e) => drag(e)}>
	<p>
		Score : {values.filter((el: Value) => el.found).length}
		/
		{data.pokemons.length}
	</p>

	<div class="settings">
		<button onclick={() => reset()}>Reset</button>
		<label>
			Shuffle
			<input
				type="checkbox"
				name="shuffle"
				checked={params.shuffleMod}
				oninput={() => {
					changeMod();
				}}
			/>
		</label>
		<div>
			<label for="lang" class="toggle-switch">
				<p>FR</p>
				<input
					type="checkbox"
					id="lang"
					class="toggle-input"
					checked={params.lang === 'en'}
					oninput={() => changeLang()}
				/>
				<div class="toggle-button">{params.lang}</div>
				<p>EN</p>
			</label>
		</div>
	</div>

	<div class="timer">
		<p class:paused={timer.isPaused}>
			{timer.elapsedTime !== '' ? timer.elapsedTime : 'Timer'}
		</p>
		{#if (!timer.isReadyToStart && !timer.isOperating) || timer.isPaused}
			<button onclick={() => startTimer()}>⏵</button>
		{:else}
			<button onclick={() => pauseTimer()} disabled={!timer.isOperating}>⏸</button>
		{/if}
		<button
			onclick={() => stopTimer()}
			disabled={!timer.isOperating && !timer.isReadyToStart && !timer.isPaused}>⏹</button
		>
	</div>
</div>

<ul>
	{#each pokemons as pokemon}
		{@const i = pokemon.pokedex_id - 1}
		<li>
			<img
				src={isItShiny() ? pokemon.sprites.shiny : pokemon.sprites.regular}
				alt="pokemon#{pokemon?.pokedex_id}"
				class:found={values[i].found}
			/>
			<input
				type="text"
				id="pokename{pokemon.pokedex_id}"
				style="color: {values[i].found ? 'green' : 'red'}"
				bind:value={values[i].answer}
				oninput={() => validateAnswer(values[i].answer, i)}
				onkeydown={() => {
					if (timer.isReadyToStart) {
						timer = { ...timer, isReadyToStart: false, isOperating: true };
						manageTimer();
					}
				}}
				disabled={values[i].found}
			/>
		</li>
	{/each}
</ul>

<style>
	button {
		cursor: pointer;
	}
	button:disabled {
		cursor: auto;
	}
	.hud {
		cursor: move;
		position: fixed;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		z-index: 1;
		min-width: 420px;
		/* padding-bottom: 0.5rem; */
		padding-inline: 2rem;
		display: flex;
		/* flex-direction: column; */
		justify-content: center;
		align-items: center;
		gap: 1rem;
		background-color: rgba(143, 27, 27, 0.538);
		backdrop-filter: blur(4px);
		border-top-left-radius: 20px;
		border-top-right-radius: 20px;
	}
	.settings {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
	}
	.toggle-switch {
		display: flex;
		justify-content: space-evenly;
		align-items: center;
		position: relative;
		width: 35px;
		height: 15px;
		border-radius: 17.5px;
		box-shadow:
			3px 3px 3px rgba(0, 0, 0, 0.252) inset,
			-1px -1px 1px rgba(255, 255, 255, 0.286) inset;
		font-size: 0.6em;
	}
	.toggle-input {
		display: none;
	}
	.toggle-button {
		position: absolute;
		left: 0;
		width: 20px;
		height: 20px;
		background-color: #fff;
		border-radius: 10px;
		cursor: pointer;
		transition: all 0.5s;
		display: grid;
		place-items: center;
		text-transform: uppercase;
	}
	:global(.toggle-input:checked ~ .toggle-button) {
		left: 100%;
		transform: translateX(-100%);
	}
	.timer {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	.timer button {
		background: none;
		border: none;
	}
	.paused {
		animation: blink 1.5s infinite;
	}
	@keyframes blink {
		from {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	ul {
		display: flex;
		justify-content: center;
		list-style: none;
		gap: 2rem 1rem;
		flex-wrap: wrap;
	}

	li {
		display: flex;
		flex-direction: column;
		width: 120px;
	}

	li img {
		object-fit: cover;
		filter: brightness(0);
		transition: 0.4s;
		-webkit-user-drag: none;
	}
	.found {
		filter: brightness(1);
		animation: reveal 0.7s forwards;
		transition: 0.4s;
	}
	@keyframes reveal {
		from {
			filter: brightness(0);
			transform: scale(1);
		}
		70% {
			filter: brightness(1);
			transform: scale(1.5);
		}
		80% {
			transform: scale(1.5);
		}
		to {
			transform: scale(1);
		}
	}
</style>
