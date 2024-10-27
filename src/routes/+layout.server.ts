import type { DirtyPokemon } from '$lib/types';
import { error } from '@sveltejs/kit';

export async function load({ fetch, setHeaders }) {
  const pokemonListGqlQuery = `query customPokemonList($gen: [Int!]) {
        pokemon_v2_pokemonspecies(order_by: {id: asc}, where: {generation_id: {_in: $gen}}) {
          id
          generation_id
          pokemon_v2_pokemonspeciesnames(where: {pokemon_v2_language: {name: {_in: ["fr", "en"]}}}) {
            name
            language: pokemon_v2_language {
              name
            }
          }
          pokemon_v2_pokemons(limit: 1) {
            sprites: pokemon_v2_pokemonsprites {
              front_default: sprites(path: "front_default")
              front_shiny: sprites(path: "front_shiny")
            }
          }
        }
      }`

  const pokemonListGqlVariables = {
    gen: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  };

  const response = await fetch('https://beta.pokeapi.co/graphql/v1beta', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: pokemonListGqlQuery,
      variables: pokemonListGqlVariables,
    }),
    method: 'POST',
  })

  const cacheControl = response.headers.get('cache-control')
  if (cacheControl) {
    setHeaders({ 'cache-control': cacheControl })
  }

  if (!response.ok) {
    throw error(response.status, "Could not fetch pokemons")
  }

  const result = await response.json()

  const simplifiedPokemonData =
    result.data.pokemon_v2_pokemonspecies.map((pokemon: DirtyPokemon) => {
      const names: { [key: string]: string } = {};
      pokemon.pokemon_v2_pokemonspeciesnames.forEach((nameObj) => {
        names[nameObj.language.name] = nameObj.name;
      });

      return {
        id: pokemon.id,
        generation_id: pokemon.generation_id,
        sprites: {
          default: pokemon.pokemon_v2_pokemons[0].sprites[0].front_default,
          shiny: pokemon.pokemon_v2_pokemons[0].sprites[0].front_shiny
        },
        names
      };
    });

  return { pokemons: simplifiedPokemonData || [] };
}