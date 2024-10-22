export async function load() {
    const headers = new Headers({
        "User-Agent": "SvelteTestApplication",
        "From": "parkerpool@live.fr",
        'Content-type': 'application/json'
    })

    const request = new Request("https://tyradex.tech/api/v1/gen/1", {
        method: "GET",
        headers: headers,
        mode: "cors",
        cache: "default",
    });

    let pokemons

    try {
        await fetch(request)
            .then((res) => res.json())
            .then((data) => pokemons = data);
    } catch (error) {
        console.error("Erreur :", error);
    }

    return { pokemons };
}