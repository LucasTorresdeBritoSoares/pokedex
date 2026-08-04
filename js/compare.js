const compareState = {
    slot1: null,
    slot2: null
};

function selectForComparison(pokemon, slot) {
    if (slot === 1) {
        compareState.slot1 = pokemon;
    } else {
        compareState.slot2 = pokemon;
    }
    updateCompareSlots();
}

function updateCompareSlots() {
    const slot1 = document.getElementById('compareSlot1');
    const slot2 = document.getElementById('compareSlot2');
    const btn = document.getElementById('compareBtn');

    renderCompareSlot(slot1, compareState.slot1);
    renderCompareSlot(slot2, compareState.slot2);

    const canCompare = compareState.slot1 && compareState.slot2;
    btn.disabled = !canCompare;
}

function renderCompareSlot(element, pokemon) {
    if (!pokemon) {
        element.innerHTML = '<p>Selecione um Pokémon</p>';
        element.classList.remove('filled');
        return;
    }

    const image = getPokemonImage(pokemon);
    element.innerHTML = `
        <img src="${image}" alt="${pokemon.name}">
        <span>#${String(pokemon.id).padStart(3, '0')} ${pokemon.name}</span>
        <button class="slot-remove" data-slot="${element === document.getElementById('compareSlot1') ? 1 : 2}">×</button>
    `;
    element.classList.add('filled');

    const removeBtn = element.querySelector('.slot-remove');
    removeBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        const slot = parseInt(removeBtn.dataset.slot);
        if (slot === 1) {
            compareState.slot1 = null;
        } else {
            compareState.slot2 = null;
        }
        const results = document.getElementById('compareResults');
        if (results) results.remove();
        updateCompareSlots();
    });
}

function setupCompareListeners() {
    document.getElementById('compareBtn').addEventListener('click', runComparison);
    document.getElementById('compareReset').addEventListener('click', resetCompare);
}

function resetCompare() {
    compareState.slot1 = null;
    compareState.slot2 = null;
    updateCompareSlots();
    const results = document.getElementById('compareResults');
    if (results) results.remove();
}

function getTotalStats(pokemon) {
    return pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);
}

function runComparison() {
    const existing = document.getElementById('compareResults');
    if (existing) existing.remove();

    const p1 = compareState.slot1;
    const p2 = compareState.slot2;
    const t1 = getTotalStats(p1);
    const t2 = getTotalStats(p2);

    const container = document.createElement('div');
    container.id = 'compareResults';
    container.classList.add('compare-results');

    let resultClass, message;
    if (t1 === t2) {
        resultClass = 'tie';
        message = `Empate!<br>${p1.name} e ${p2.name} têm ${t1} de stats`;
    } else {
        const winner = t1 > t2 ? p1 : p2;
        const loser = t1 > t2 ? p2 : p1;
        resultClass = 'winner';
        message = `${winner.name} vence!<br>${winner.name}: ${Math.max(t1, t2)} vs ${loser.name}: ${Math.min(t1, t2)}`;
    }

    container.innerHTML = `<div class="compare-result ${resultClass}">${message}</div>`;
    document.getElementById('compareSection').appendChild(container);
}
