export interface DirtyPokemon {
    id: number;
    generation_id: number;
    pokemon_v2_pokemons: [
        {
            sprites: [
                {
                    front_default: string;
                    front_shiny: string;
                }
            ];
        }
    ];
    pokemon_v2_pokemonspeciesnames: [
        {
            name: string;
            language: {
                name: string;
            };
        }
    ];
}

export interface Pokemon {
    id: number;
    generation_id: number;
    sprites: {
        default: string;
        shiny: string;
    };
    names: {
        en: string;
        fr: string;
    };
}


export interface Value {
    id: number;
    answer: string;
    found: boolean;
}

export type Language = 'fr' | 'en';
export interface Params {
    clicked: boolean,
    hide: boolean;
    shuffleMod: boolean;
    lang: Language;
    gen: { [key: string]: boolean };
}