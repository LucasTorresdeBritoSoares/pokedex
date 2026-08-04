const API_BASE = 'https://pokeapi.co/api/v2';
const GEN_LIMITS = {
    1: { offset: 0, limit: 151 },
    2: { offset: 151, limit: 100 },
    3: { offset: 251, limit: 135 },
    4: { offset: 386, limit: 107 },
    5: { offset: 493, limit: 156 },
    6: { offset: 649, limit: 72 },
    7: { offset: 721, limit: 88 },
    8: { offset: 809, limit: 96 },
    9: { offset: 905, limit: 120 }
};

async function fetchPokemonList(offset = 0, limit = 20) {
    const response = await fetch(`${API_BASE}/pokemon?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error('Falha ao buscar lista de Pokémon');
    const data = await response.json();
    return data;
}

async function fetchPokemonByNameOrId(identifier) {
    const response = await fetch(`${API_BASE}/pokemon/${encodeURIComponent(identifier)}`);
    if (!response.ok) return null;
    return response.json();
}

async function fetchPokemonDetails(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao buscar detalhes');
    return response.json();
}

async function fetchPokemonSpecies(id) {
    const response = await fetch(`${API_BASE}/pokemon-species/${id}`);
    if (!response.ok) return null;
    return response.json();
}

async function fetchEvolutionChain(url) {
    const response = await fetch(url);
    if (!response.ok) return null;
    return response.json();
}

async function fetchTypePokemon(type) {
    const response = await fetch(`${API_BASE}/type/${type}`);
    if (!response.ok) return null;
    return response.json();
}

function extractTypes(pokemon) {
    return pokemon.types.map(t => t.type.name);
}

function getPokemonImage(pokemon) {
    const sprites = pokemon.sprites;
    if (!sprites) return null;
    return sprites.other['official-artwork'].front_default ||
           sprites.front_default ||
           sprites.other['dream_world'].front_default;
}

function getSpeciesId(url) {
    const parts = url.split('/').filter(Boolean);
    return parseInt(parts[parts.length - 1]);
}

function getGenerationRange(gen) {
    return GEN_LIMITS[gen] || null;
}

function extractDescription(species) {
    if (!species || !species.flavor_text_entries) return null;
    const entry = species.flavor_text_entries.find(e => e.language.name === 'en');
    if (!entry) return null;
    return entry.flavor_text.replace(/[\n\r\f]/g, ' ');
}
