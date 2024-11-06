<script lang="ts">
	import { onMount } from 'svelte';
	import type { Pokemon, Value, Params, Language } from '$lib/types';

	const { data } = $props<{ data: { pokemons: Pokemon[] | [] } }>();
	let pokemonsData = $state<Pokemon[] | []>(data.pokemons);
	let params = $state<Params>({
		clicked: false,
		hide: true,
		shuffleMod: false,
		lang: 'fr',
		gen: {
			'1': true,
			'2': false,
			'3': false,
			'4': false,
			'5': false,
			'6': false,
			'7': false,
			'8': false,
			'9': false
		}
	});
	let pokemons = $derived.by<Pokemon[] | []>(() => {
		const selectedGens = Object.keys(params.gen).filter((gen: string) => params.gen[gen]);
		return pokemonsData.filter((pk: Pokemon) => {
			return selectedGens.includes(pk.generation_id.toString());
		});
	});

	/* Initialise un tableau d'objets pour stocker les réponses */
	const getValues = () => {
		return pokemonsData.map((pk: Pokemon) => ({
			id: pk.id,
			answer: '',
			found: false,
			animPlayed: false
		}));
	};
	let values = $state<Value[]>(getValues());

	let timer = $state({
		isReadyToStart: false,
		isOperating: false,
		isPaused: false,
		elapsedTime: '00:00',
		previousTime: '00:00'
	});

	const generations = Array.from({ length: 9 }, (_, i) => i + 1);

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
			gen: localStorage.getItem('gen'),
			timer: localStorage.getItem('timer')
		};

		if (localStorageItems.savedAnswers) values = JSON.parse(localStorageItems.savedAnswers);
		if (localStorageItems.shuffleGameMod)
			params.shuffleMod = JSON.parse(localStorageItems.shuffleGameMod);
		if (localStorageItems.shuffleGameMod && localStorageItems.shuffledPokemons) {
			pokemonsData = JSON.parse(localStorageItems.shuffledPokemons);
		}
		if (localStorageItems.gameLang) params.lang = localStorageItems.gameLang as Language;
		if (localStorageItems.gen) params.gen = JSON.parse(localStorageItems.gen);

		if (localStorageItems.timer) {
			timer = JSON.parse(localStorageItems.timer);
			localStorage.removeItem('timer');
		}
	}

	let playAnim: number;
	function validateAnswer(value: string, index: number): void {
		/* S'assure que la valeur ne contient pas de charactères spéciaux
		Accents et charactères spé. présents dans les noms de pokémons français : âçéÉêèïô-:\s\.♀♂ */
		const cleanValue = (str: string): string => str.normalize('NFD').replace(/[^a-z\s\.-]/gi, '');
		/* Met une majuscule à tous les mots */
		values[index].answer = cleanValue(value)
			.split(' ')
			.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
			.join(' ');
		/* Détecte si la réponse est juste */
		const pokemon = pokemons.find((pk: Pokemon) => pk.id === index + 1);
		if (pokemon) {
			if (
				values[index].answer.toLowerCase() ===
				cleanValue(pokemon?.names[params.lang].toLowerCase() ?? '')
			) {
				values[index] = {
					...values[index],
					answer: pokemon?.names[params.lang] || values[index].answer,
					found: true
				};
				localStorage.setItem('pokemonAnswers', JSON.stringify(values));

				playAnim = setTimeout(() => {
					values[index].animPlayed = true;
					localStorage.setItem('pokemonAnswers', JSON.stringify(values));
				}, 700);
			}
			if (runTimer && values.every((val: Value) => val.found)) {
				stopTimer(); // Stop le timer si toutes les réponses sont trouvées
			}
		}
	}

	function shufflePokemons(): void {
		const result: Pokemon[] = [];

		pokemonsData.forEach((_) => {
			const getRandomPkmnId = (): number => {
				// On utilise la récursivité pour trouver un id de pokemon qui ne soit pas déjà présent dans le tableau
				const randomNum = Math.floor(Math.random() * pokemonsData.length) + 1;
				if (result.length !== 0 && result.some((pk: Pokemon) => pk?.id === randomNum)) {
					return getRandomPkmnId();
				}
				return randomNum;
			};
			const randomPkmnId = getRandomPkmnId();
			const randomPokemon = pokemonsData.find((pk: Pokemon) => pk.id === randomPkmnId);
			if (randomPokemon) result.push(randomPokemon);
		});

		pokemonsData = result;
		localStorage.setItem('shuffledPokemons', JSON.stringify(pokemonsData));
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
			pokemonsData = data.pokemons;
		}
	}

	function changeLang(e: Event): void {
		const input = e.target as HTMLInputElement;
		params.lang = (input.value as Language) ?? (params.lang === 'fr' ? 'en' : 'fr');
		values = values.map((val: Value) => {
			if (val.found) {
				return {
					...val,
					answer: pokemons.find((pkmn: Pokemon) => pkmn.id === val.id)?.names[params.lang] ?? ''
				};
			} else return val;
		});
		localStorage.setItem('gameLang', params.lang);
		localStorage.setItem('pokemonAnswers', JSON.stringify(values));
	}

	/* ----- Timer functions ----- */
	function initiateTimer(): void {
		timer = { ...timer, isReadyToStart: true, isPaused: false, elapsedTime: timer.previousTime };
	}
	function startTimer(): void {
		if (timer.isReadyToStart) {
			timer = { ...timer, isReadyToStart: false, isOperating: true };
			manageTimer();
		}
	}
	function pauseTimer(): void {
		timer = {
			...timer,
			isOperating: false,
			isPaused: true,
			previousTime: timer.elapsedTime
		};
		manageTimer();
	}
	function stopTimer(): void {
		timer = {
			...timer,
			isReadyToStart: false,
			isOperating: false,
			isPaused: false,
			previousTime: '00:00'
		};
		manageTimer();
	}

	let runTimer: number | undefined;
	function manageTimer(): void {
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

	function handleGenSelect(num: number): void {
		params.gen[num] = !params.gen[num];
		localStorage.setItem('gen', JSON.stringify(params.gen));
	}

	/* Réinitialise le réponses mais pas les paramètres */
	function reset(): void {
		values = getValues();
		localStorage.removeItem('pokemonAnswers');
	}

	onMount(() => {
		loadItems(); // Charge les éléments du localStorage au montage du composant
		return () => {
			if (playAnim) clearTimeout(playAnim);
			if (runTimer) {
				// Met en pause le timer au démontage s'il est actif
				pauseTimer();
				localStorage.setItem('timer', JSON.stringify(timer));
			}
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

<div
	class="hud"
	class:display-hud={!params.hide && params.clicked}
	class:conceal-hud={params.hide && params.clicked}
>
	<div class="score">
		<legend>Score:</legend>
		<p>
			{values.filter((val: Value) => pokemons.some((pk: Pokemon) => pk.id === val.id) && val.found)
				.length} / {pokemons.length}
		</p>
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

	<div class="gen-select">
		<legend>Générations:</legend>
		{#each generations as num}
			<label for="gen{num}">
				{num}
				<input
					type="checkbox"
					id="gen{num}"
					bind:checked={params.gen[num.toString()]}
					oninput={() => handleGenSelect(num)}
				/>
			</label>
		{/each}
	</div>

	<button class="reset" onclick={() => reset()}>Reset</button>

	<label for="hide-hud-btn" class="hide-hud-btn"
		>CACHER<input
			type="button"
			id="hide-hud-btn"
			aria-label="hide hud"
			onclick={() => ((params.hide = true), (params.clicked = true))}
		/></label
	>
</div>
<button
	class="show-hud-btn"
	class:display-show-hud-btn={params.hide && params.clicked}
	class:conceal-show-hud-btn={!params.hide && params.clicked}
	style={timer.isOperating ? 'padding: 0 1rem;' : 'font-size: 1.5em'}
	aria-label="show hud"
	onclick={() => ((params.hide = false), (params.clicked = true))}
	>{timer.isOperating ? timer.elapsedTime : '!'}</button
>

<ul class="poke-list">
	{#if pokemons && pokemons.length > 0}
		{#each pokemons as pokemon}
			{@const i = pokemon.id - 1}
			<li>
				<img
					src={isItShiny()
						? pokemon.sprites.shiny || pokemon.sprites.default
						: pokemon.sprites.default}
					alt="pokemon#{pokemon.id}"
					style={values[i].found ? `filter: brightness(1)` : ''}
					class:found={values[i].found && !values[i].animPlayed}
				/>
				<input
					type="text"
					id="pokename{pokemon.id}"
					style="color: {values[i].found ? 'green' : 'red'}"
					bind:value={values[i].answer}
					oninput={() => validateAnswer(values[i].answer, i)}
					onkeydown={() => startTimer()}
					disabled={values[i].found}
				/>
			</li>
		{/each}
	{:else}
		<p>Il n'y aucun Pokémon à afficher</p>
		<p>
			Vous devriez peut-être essayer utiliser un peu d'encens...
			<button onclick={() => handleGenSelect(1)}
				><img src="/icons/encens.png" alt="encens" /></button
			>
		</p>
	{/if}
</ul>

<style>
	.hud {
		position: fixed;
		bottom: -100%;
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
	:global(.display-hud) {
		animation: slidein 1.5s forwards;
	}
	@keyframes slidein {
		from {
			bottom: -100%;
		}
		60% {
			bottom: -100%;
		}
		90% {
			bottom: 20px;
		}
		to {
			bottom: 10px;
		}
	}
	:global(.conceal-hud) {
		animation: slideout 1.2s forwards;
	}
	@keyframes slideout {
		from {
			bottom: 10px;
		}
		20% {
			bottom: 20px;
		}
		to {
			bottom: -100%;
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
		transition: 0.2s;
	}
	.hide-hud-btn {
		cursor: pointer;
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
		transition: 0.2s;
	}
	.hide-hud-btn input {
		width: 30px;
		height: 15px;
		background-color: var(--action-color);
		clip-path: polygon(100% 0, 0 0, 50% 100%);
	}
	.show-hud-btn {
		position: fixed;
		bottom: 10px;
		left: 10px;
		z-index: 1;
		min-width: 45px;
		height: 50px;
		background-color: #fff;
		color: var(--action-color);
		border: 3px solid var(--dark-color);
		border-radius: 5px;
		box-shadow:
			0 0 0 3px #ffffff,
			5px 5px 0 0 rgba(0, 0, 0, 0.4);
		transition: 0.2s;
	}
	:global(.display-show-hud-btn) {
		animation: appear 1.5s forwards;
	}
	@keyframes appear {
		from {
			transform: translateY(300px);
		}
		70% {
			transform: translateY(300px);
		}
		90% {
			transform: translateY(-10px);
		}
		to {
			transform: translateY(0);
		}
	}
	:global(.conceal-show-hud-btn) {
		animation: conceal 1.2s forwards;
	}
	@keyframes conceal {
		20% {
			transform: translateY(-10px);
		}
		to {
			transform: translateY(300px);
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

	@media (pointer: fine), (pointer: none) {
		/* Detects non touchscreens only for hover events on desktops and laptops */
		.shuffle-param input:not(:checked):has(~ label:hover),
		.lang-param input:not(:checked):has(~ label:hover) {
			background-color: var(--font-color);
			clip-path: polygon(0% 0%, 0% 100%, 10% 85%, 10% 15%, 80% 50%, 10% 85%, 0 100%, 100% 50%);
		}
		.reset:hover {
			box-shadow:
				2px 2px 2px 0 #00000062 inset,
				-1px -1px 1px 0 rgba(254, 254, 254, 0.329) inset;
			transition: 0.2s;
		}
		.hide-hud-btn:hover,
		.show-hud-btn:hover {
			transform: translateY(-5px);
			transition: 0.2s;
		}
	}
</style>
