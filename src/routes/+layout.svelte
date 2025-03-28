<script lang="ts">
	import { page } from '$app/stores';
	const { children } = $props();

	const active = $derived($page.url.pathname);
</script>

<header>
	<nav>
		<ul>
			<li><a href="/" class:active={active === '/'}>Accueil</a></li>
			<li>
				<a href="/score" class:active={active === '/score'}>Score</a>
			</li>
		</ul>
	</nav>
</header>

{@render children()}

<style>
	a {
		font-family: var(--secondary-font);
	}
	.active {
		color: var(--main-color);
	}

	ul {
		display: flex;
		list-style: none;
		gap: 2rem;
	}

	nav {
		min-width: 200px;
		margin: 1rem;
		padding: 1rem 2rem;
		background-color: rgb(255, 255, 255);
		border-radius: 20px;
		border: 6px solid var(--secondary-color);
		box-shadow:
			0 0 0 2px #4a74a5,
			0 0 0 1px #4a74a525 inset,
			4px 4px 0 0 rgba(0, 0, 0, 0.4);
		text-shadow: 1px 1px rgba(0, 0, 0, 0.2);
		position: relative;

		&::before,
		&::after {
			content: '';
			position: absolute;
			width: 10px;
			height: 60%;
			background-color: #e1f0f8;
			border-radius: 5px;
			top: 50%;
			transform: translateY(-50%);
		}
		&::before {
			left: 6px;
		}
		&::after {
			right: 6px;
		}
	}
</style>
