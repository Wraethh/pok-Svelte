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
	let params = $state({ hide: false, shuffleMod: false, lang: 'fr' });
	let timer = $state({
		isReadyToStart: false,
		isOperating: false,
		isPaused: false,
		elapsedTime: '00:00',
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

	function loadItems(): void {
		// Charge les données depuis le localStorage
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
		/* S'assure que la valeur ne contient pas de charactères spéciaux
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

	function changeMod(e: Event): void {
		const input = e.target as HTMLInputElement;
		params.shuffleMod = input.value === 'oui' ? true : false;
		if (params.shuffleMod) {
			localStorage.setItem('shuffleGameMod', JSON.stringify(true));
			shufflePokemons();
		} else {
			localStorage.removeItem('shuffleGameMod');
			localStorage.removeItem('shuffledPokemons');
			pokemons = pokemons.sort((a: Pokemon, b: Pokemon) => a.pokedex_id - b.pokedex_id);
		}
	}

	function changeLang(e: Event) {
		const input = e.target as HTMLInputElement;
		params.lang = input.value ?? (params.lang === 'fr' ? 'en' : 'fr');
		values = values.map((el: Value) => {
			if (el.found) {
				return {
					...el,
					answer: pokemons.find((pkmn: Pokemon) => pkmn.pokedex_id === el.id).name[params.lang]
				};
			} else return el;
		});
		localStorage.setItem('gameLang', params.lang);
		localStorage.setItem('pokemonAnswers', JSON.stringify(values));
	}

	function initiateTimer() {
		timer = { ...timer, isReadyToStart: true, isPaused: false, elapsedTime: timer.previousTime };
	}
	function startTimer() {
		if (timer.isReadyToStart) {
			timer = { ...timer, isReadyToStart: false, isOperating: true };
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
				const delta = Date.now() - start;
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

	// function drag(e: MouseEvent): void {
	// 	e.preventDefault();
	// 	const dragBox = e.target as HTMLElement;

	// 	document.onmousemove = (e) => {
	// 		e.preventDefault();
	// 		const newLeft = dragBox.offsetLeft + e.movementX;
	// 		const minLeft = dragBox.offsetWidth / 2;
	// 		const maxLeft = window.innerWidth - dragBox.offsetWidth / 2;
	// 		// Limite la position à l'intérieur de l'écran
	// 		if (newLeft >= minLeft && newLeft <= maxLeft) {
	// 			dragBox.style.left = `${newLeft}px`;
	// 		}
	// 	};

	// 	document.onmouseup = () => {
	// 		document.onmouseup = null;
	// 		document.onmousemove = null;
	// 	};
	// }

	onMount(() => {
		loadItems(); // Charge les éléments du localStorage au montage du composant
		return () => {
			if (runTimer) {
				pauseTimer();
				localStorage.setItem('timer', JSON.stringify(timer));
			} // Met en pause le timer au démontage s'il est actif
		};
	});
</script>

<h1>Challenge</h1>

<p>
	Le Professeur Chen a perdu toutes ses données sur les pokémons après que son disque dur ait rendu
	l'âme. Il n'a pas fait de backup alors il espère que vous pourrez l'aider à reconstituer une
	partie de ses données grâce à vos connaissances extensives des pokémons ! <br /> Saurez-vous retrouver
	le nom de tous ces pokémons ?
</p>

<div class="hud" class:concealed-hud={params.hide}>
	<div class="score">
		<legend>Score:</legend>
		<p>{values.filter((el: Value) => el.found).length} / {data.pokemons.length}</p>
	</div>

	<div class="timer">
		<legend>Timer:</legend>

		<div>
			<p class:paused={timer.isPaused}>{timer.elapsedTime}</p>

			{#if (!timer.isReadyToStart && !timer.isOperating) || timer.isPaused}
				<button onclick={() => initiateTimer()}>▶️</button>
			{:else}
				<button onclick={() => pauseTimer()} disabled={!timer.isOperating}>⏸️</button>
			{/if}
			<button
				onclick={() => stopTimer()}
				disabled={!timer.isOperating && !timer.isReadyToStart && !timer.isPaused}>⏹️</button
			>
		</div>
	</div>

	<div class="shuffle-param">
		<legend>Mélanger:</legend>
		<div>
			<div>
				<input
					type="radio"
					id="oui"
					name="yesno"
					value="oui"
					checked={params.shuffleMod}
					oninput={(e) => changeMod(e)}
				/>
				<label for="oui" class="click">oui</label>
			</div>
			<div>
				<input
					type="radio"
					id="non"
					name="yesno"
					value="non"
					checked={!params.shuffleMod}
					oninput={(e) => changeMod(e)}
				/>
				<label for="non" class="click">non</label>
			</div>
		</div>
	</div>

	<div class="lang-param">
		<legend>Langue:</legend>
		<div>
			<div>
				<input
					type="radio"
					id="fr"
					name="lang"
					value="fr"
					checked={params.lang === 'fr'}
					oninput={(e) => changeLang(e)}
				/>
				<label for="fr" class="click">fr</label>
			</div>
			<div>
				<input
					type="radio"
					id="en"
					name="lang"
					value="en"
					checked={params.lang === 'en'}
					oninput={(e) => changeLang(e)}
				/>
				<label for="en" class="click">en</label>
			</div>
		</div>
	</div>

	<button class="reset" onclick={() => reset()}>Reset</button>

	<label for="hide-hud" class="hide-hud"
		>CACHER<input
			type="button"
			id="hide-hud"
			aria-label="hide hud"
			onclick={() => (params.hide = true)}
		/></label
	>
</div>
<button
	class="show-hud"
	class:nodisplay={!params.hide}
	style={timer.isOperating ? 'padding: 0 1rem;' : 'font-size: 1.5em'}
	aria-label="show hud"
	onclick={() => (params.hide = false)}>{timer.isOperating ? timer.elapsedTime : '!'}</button
>

<ul class="poke-list">
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
				onkeydown={() => startTimer()}
				disabled={values[i].found}
			/>
		</li>
	{/each}
</ul>

<style>
	.hud {
		position: fixed;
		bottom: 10px;
		left: 10px;
		z-index: 10;
		min-width: 250px;
		padding: 1rem 2rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: start;
		gap: 1rem;
		background-color: rgb(255, 255, 255);
		border-radius: 20px;
		border: 6px solid var(--secondary-color);
		box-shadow:
			0 0 0 2px #4a74a5,
			0 0 0 1px #4a74a525 inset,
			4px 4px 0 0 rgba(0, 0, 0, 0.4);
		text-shadow: 1px 1px rgba(0, 0, 0, 0.2);
	}
	.hud::before,
	.hud::after {
		content: '';
		position: absolute;
		width: 10px;
		height: 60%;
		background-color: #e1f0f8;
		border-radius: 5px;
	}
	.hud::before {
		left: 6px;
	}
	.hud::after {
		right: 6px;
	}
	.hud * {
		font-family: var(--secondary-font);
	}
	:global(.concealed-hud) {
		animation: conceal 1.2s forwards;
	}
	@keyframes conceal {
		20% {
			transform: translateY(-10px);
		}
		to {
			transform: translateY(120%);
		}
	}

	.score,
	.timer,
	.lang-param,
	.shuffle-param {
		display: flex;
		gap: 1rem;
	}
	.lang-param > div,
	.shuffle-param > div,
	.timer > div {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.lang-param div > div,
	.shuffle-param div > div {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.shuffle-param input,
	.lang-param input {
		appearance: none;
		-webkit-appearance: none;
		width: 10px;
		height: 10px;
	}
	.shuffle-param label,
	.lang-param label {
		font-variant: small-caps;
	}
	.shuffle-param input:checked,
	.lang-param input:checked {
		background-color: var(--font-color);
		clip-path: polygon(0 0, 0% 100%, 100% 50%);
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
	.reset {
		padding: 0.3rem 1rem;
		border-radius: 20px;
		background-color: var(--font-color);
		color: var(--light-color);
	}
	.hide-hud {
		position: absolute;
		bottom: -10px;
		right: 20px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		color: var(--action-color);
		font-size: 0.48em;
		z-index: 1;
		filter: drop-shadow(1px 1px rgba(0, 0, 0, 0.3));
	}
	.hide-hud input {
		width: 30px;
		height: 15px;
		background-color: var(--action-color);
		clip-path: polygon(100% 0, 0 0, 50% 100%);
	}
	.show-hud {
		position: fixed;
		bottom: 10px;
		left: 10px;
		z-index: 1;
		min-width: 45px;
		height: 50px;
		background-color: #fff;
		color: var(--action-color);
		border: 2px solid var(--dark-color);
		border-radius: 5px;
		box-shadow:
			0 0 0 3px #ffffff,
			5px 5px 0 0 rgba(0, 0, 0, 0.4);
		animation: appear 2s;
	}
	@keyframes appear {
		from {
			transform: translateY(120px);
		}
		70% {
			transform: translateY(120px);
		}
		90% {
			transform: translateY(-10px);
		}
		to {
			transform: translateY(0);
		}
	}
	.poke-list {
		display: flex;
		justify-content: center;
		list-style: none;
		gap: 2rem 1rem;
		flex-wrap: wrap;
		margin-bottom: 8rem;
	}

	.poke-list li {
		display: flex;
		flex-direction: column;
		width: 120px;
	}

	.poke-list li img {
		object-fit: cover;
		filter: brightness(0);
		transition: 0.4s;
		-webkit-user-drag: none;
	}
	.poke-list .found {
		filter: brightness(1);
		animation: reveal 0.7s;
	}
	@keyframes reveal {
		from {
			transform: scale(1);
		}
		70% {
			transform: scale(1.5);
		}
		80% {
			transform: scale(1.5);
		}
		to {
			transform: scale(1);
		}
	}

	@media (width <= 480px) {
		.hud {
			gap: 1.5rem;
		}
		.score,
		.timer,
		.lang-param,
		.shuffle-param {
			flex-direction: column;
		}
	}
</style>
