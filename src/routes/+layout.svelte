<script lang="ts">
	import { page } from '$app/stores';
	const { children } = $props();

	const active = $derived($page.url.pathname);
</script>

<header>
	<nav>
		<ul>
			<li><a href="/" class:active={active === '/'}>Home</a></li>
			<li>
				<a href="/a-propos" class:active={active === '/a-propos'}>À propos</a>
			</li>
			<li>
				<a href="/pokedex" class:active={active === '/pokedex'}>Pokédex</a>
			</li>
			<li><a href="/equipe" class:active={active === '/equipe'}>Équipe</a></li>
			<li><a href="/profil" class:active={active === '/profil'}>Profil</a></li>
		</ul>
	</nav>
</header>

{@render children()}

<style>
	.active {
		color: var(--main-color);
	}

	ul {
		display: flex;
		list-style: none;
		gap: 0.5rem;
	}
</style>
