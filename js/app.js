const FALLBACK_IMAGE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<circle cx="50" cy="50" r="48" fill="#e2e8f0"/>' +
    '<path d="M2 50a48 48 0 0 1 96 0" fill="#94a3b8"/>' +
    '<circle cx="50" cy="50" r="14" fill="#e2e8f0" stroke="#64748b" stroke-width="3"/>' +
    '</svg>'
);

const SCALES_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M8 21h8"/><path d="M7 7h10"/><path d="M7 7 5.5 11a2.5 2.5 0 0 0 5 0L9 7"/><path d="M17 7l-1.5 4a2.5 2.5 0 0 0 5 0L19 7"/></svg>';

const SPARKLE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/><path d="M19 15l.9 2.9L23 19l-3.1.9L19 23l-.9-3.1L15 19l3.1-1.1z"/></svg>';

const state = {
    currentPage: 1,
    pageSize: 20,
    searchTerm: '',
    typeFilter: '',
    generationFilter: '',
    activeView: 'all',
    totalPokemon: 0,
    totalPages: 0,
    cachedPokemon: {},
    requestId: 0,
    modalId: 0
};

const elements = {
    grid: document.getElementById('pokemonGrid'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    typeFilter: document.getElementById('typeFilter'),
    generationFilter: document.getElementById('generationFilter'),
    clearFilters: document.getElementById('clearFilters'),
    pagination: document.getElementById('pagination'),
    prevPage: document.getElementById('prevPage'),
    nextPage: document.getElementById('nextPage'),
    pageInfo: document.getElementById('pageInfo'),
    modal: document.getElementById('pokemonModal'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.getElementById('modalClose'),
    toast: document.getElementById('toast'),
    totalPokemon: document.getElementById('totalPokemon'),
    displayedPokemon: document.getElementById('displayedPokemon'),
    favoritesCount: document.getElementById('favoritesCount'),
    compareSection: document.getElementById('compareSection'),
    navBtns: document.querySelectorAll('.nav-btn'),
    themeToggle: document.getElementById('themeToggle')
};

function init() {
    setupTheme();
    setupEventListeners();
    setupCompareListeners();
    loadInitialData();
    updateFavoritesCount();
}

async function loadInitialData() {
    try {
        const data = await fetchPokemonList(0, 1);
        state.totalPokemon = data.count;
        elements.totalPokemon.textContent = data.count;
        await loadPokemonForCurrentView();
    } catch (error) {
        console.error(error);
        showToast('Erro ao carregar Pokémon. Tente novamente.');
    }
}

async function loadPokemonForCurrentView() {
    const requestId = ++state.requestId;
    elements.grid.innerHTML = '';
    elements.grid.appendChild(createLoadingElement());

    try {
        let result;
        if (state.activeView === 'favorites') {
            result = await loadFavorites(requestId);
        } else {
            if (state.activeView === 'compare') showCompareView();
            result = await loadPagedList(requestId);
        }

        if (result === null || requestId !== state.requestId) return;
        state.totalPages = result.totalPages;

        elements.grid.innerHTML = '';
        if (result.notFound) {
            elements.grid.innerHTML = '<div class="loading"><p>Nenhum Pokémon encontrado para a busca.</p></div>';
            elements.displayedPokemon.textContent = 0;
        } else if (result.list.length === 0) {
            elements.grid.innerHTML = '<div class="loading"><p>Você ainda não tem favoritos.</p></div>';
            elements.displayedPokemon.textContent = 0;
        } else {
            result.list.forEach((pokemon, i) => {
                const card = createPokemonCard(pokemon);
                card.style.setProperty('--delay', `${Math.min(i * 35, 600)}ms`);
                elements.grid.appendChild(card);
            });
            elements.displayedPokemon.textContent = result.list.length;
        }
        updatePagination(state.totalPages);
    } catch (error) {
        if (requestId !== state.requestId) return;
        console.error(error);
        showToast('Erro ao carregar os dados.');
        elements.grid.innerHTML = '<div class="loading"><p>Algo deu errado. Tente novamente.</p></div>';
    }
}

async function loadPagedList(requestId) {
    if (state.searchTerm) return loadSearchResult(requestId);
    if (state.typeFilter) return loadTypeResult(requestId);
    return loadPage(requestId);
}

async function loadSearchResult(requestId) {
    const pokemon = await fetchPokemonByNameOrId(state.searchTerm);
    if (requestId !== state.requestId) return null;

    if (!pokemon) return { list: [], notFound: true, totalPages: 0 };

    if (state.typeFilter && !extractTypes(pokemon).includes(state.typeFilter)) {
        return { list: [], notFound: true, totalPages: 0 };
    }

    if (state.generationFilter) {
        const range = getRangeForFilter();
        if (pokemon.id < range.offset + 1 || pokemon.id > range.offset + range.limit) {
            return { list: [], notFound: true, totalPages: 0 };
        }
    }

    return { list: [pokemon], totalPages: 0 };
}

async function loadTypeResult(requestId) {
    const typeData = await fetchTypePokemon(state.typeFilter);
    if (requestId !== state.requestId) return null;
    if (!typeData) throw new Error('Falha ao carregar o tipo');

    let entries = typeData.pokemon.map(p => p.pokemon);

    if (state.generationFilter) {
        const range = getRangeForFilter();
        entries = entries.filter(entry => {
            const id = getSpeciesId(entry.url);
            return id >= range.offset + 1 && id <= range.offset + range.limit;
        });
    }

    const totalPages = Math.ceil(entries.length / state.pageSize);
    if (state.currentPage > totalPages) state.currentPage = totalPages || 1;

    const start = (state.currentPage - 1) * state.pageSize;
    const pokemonList = await fetchPokemonEntries(entries.slice(start, start + state.pageSize), requestId);
    if (requestId !== state.requestId) return null;

    return { list: pokemonList, totalPages };
}

async function loadPage(requestId) {
    const totalPages = Math.ceil(getFilteredCount() / state.pageSize);
    if (state.currentPage > totalPages) state.currentPage = totalPages || 1;

    const range = getCurrentRange();
    const data = await fetchPokemonList(range.offset, range.limit);
    if (requestId !== state.requestId) return null;

    const pokemonList = await fetchPokemonEntries(data.results, requestId);
    if (requestId !== state.requestId) return null;

    return { list: pokemonList, totalPages };
}

async function loadFavorites(requestId) {
    const favorites = getFavorites();
    if (favorites.length === 0) return { list: [], totalPages: 0 };

    const pokemonList = await fetchPokemonEntries(favorites, requestId);
    if (requestId !== state.requestId) return null;
    return { list: pokemonList, totalPages: 0 };
}

async function fetchPokemonEntries(entries, requestId) {
    const results = await Promise.all(entries.map(async entry => {
        try {
            const pokemon = entry.url
                ? await fetchPokemonDetails(entry.url)
                : await fetchPokemonByNameOrId(entry);
            return requestId === state.requestId ? pokemon : null;
        } catch {
            return null;
        }
    }));
    return results.filter(Boolean);
}

function createLoadingElement() {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 12; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-card';
        skeleton.innerHTML = `
            <div class="skeleton skeleton-circle"></div>
            <div class="skeleton skeleton-line w40"></div>
            <div class="skeleton skeleton-line w70"></div>
            <div class="skeleton skeleton-line w50"></div>
        `;
        skeleton.style.setProperty('--delay', `${i * 40}ms`);
        fragment.appendChild(skeleton);
    }
    return fragment;
}

function createPokemonCard(pokemon) {
    state.cachedPokemon[pokemon.id] = pokemon;

    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.pokemonId = pokemon.id;

    const types = extractTypes(pokemon);
    const image = getPokemonImage(pokemon) || FALLBACK_IMAGE;
    const fav = isFavorite(pokemon.id);

    card.innerHTML = `
        <button class="favorite-btn ${fav ? 'active' : ''}" data-fav-id="${pokemon.id}">${fav ? '★' : '☆'}</button>
        <span class="pokemon-number">#${String(pokemon.id).padStart(3, '0')}</span>
        <img class="pokemon-image" src="${image}" alt="${pokemon.name}" loading="lazy">
        <h3 class="pokemon-name">${pokemon.name}</h3>
        <div class="pokemon-types">
            ${types.map(type => `<span class="type-badge type-${type}">${type}</span>`).join('')}
        </div>
        <button class="compare-card-btn" title="Comparar">${SCALES_ICON}</button>
    `;

    card.addEventListener('click', (event) => {
        if (event.target.classList.contains('favorite-btn')) return;
        if (event.target.classList.contains('compare-card-btn') || state.activeView === 'compare') {
            handleCompareClick(pokemon);
            return;
        }
        openPokemonModal(pokemon.id);
    });

    card.querySelector('.favorite-btn').addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCardFavorite(pokemon, event.currentTarget);
    });

    return card;
}

function handleCompareClick(pokemon) {
    if (compareState.slot1 && compareState.slot1.id === pokemon.id) {
        compareState.slot1 = null;
        updateCompareSlots();
        return;
    }
    if (compareState.slot2 && compareState.slot2.id === pokemon.id) {
        compareState.slot2 = null;
        updateCompareSlots();
        return;
    }

    if (!compareState.slot1) {
        selectForComparison(pokemon, 1);
        showToast(`${pokemon.name} selecionado para comparar`);
    } else if (!compareState.slot2) {
        selectForComparison(pokemon, 2);
        showToast(`${pokemon.name} selecionado para comparar`);
    } else {
        showToast('Limpe os slots para selecionar novos Pokémon');
    }
}

function toggleCardFavorite(pokemon, btn) {
    const added = toggleFavorite(pokemon.id);
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
    refreshCardFavorites();
    updateFavoritesCount();

    if (state.activeView === 'favorites' && !added) {
        btn.closest('.pokemon-card').remove();
        const remaining = document.querySelectorAll('.pokemon-card').length;
        elements.displayedPokemon.textContent = remaining;
        if (remaining === 0) {
            elements.grid.innerHTML = '<div class="loading"><p>Você ainda não tem favoritos.</p></div>';
        }
    }

    showToast(added ? `${pokemon.name} adicionado aos favoritos` : `${pokemon.name} removido dos favoritos`);
}

function refreshCardFavorites() {
    document.querySelectorAll('.pokemon-card').forEach(card => {
        const id = parseInt(card.dataset.pokemonId);
        const btn = card.querySelector('.favorite-btn');
        const fav = isFavorite(id);
        btn.classList.toggle('active', fav);
        btn.textContent = fav ? '★' : '☆';
    });
}

function updateFavoritesCount() {
    elements.favoritesCount.textContent = getFavorites().length;
}

function updatePagination(totalPages) {
    elements.pageInfo.textContent = totalPages === 0 ? '0 / 0' : `${state.currentPage} / ${totalPages}`;
    elements.prevPage.disabled = state.currentPage <= 1 || totalPages === 0;
    elements.nextPage.disabled = totalPages === 0 || state.currentPage >= totalPages;
}

function getCurrentRange() {
    const range = getRangeForFilter();
    const start = range.offset + (state.currentPage - 1) * state.pageSize;
    const end = Math.min(start + state.pageSize, range.offset + range.limit);
    return { offset: start, limit: end - start };
}

function getFilteredCount() {
    return getRangeForFilter().limit;
}

function getRangeForFilter() {
    const gen = state.generationFilter;
    if (gen) {
        return getGenerationRange(parseInt(gen));
    }
    return { offset: 0, limit: state.totalPokemon };
}

function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);

    let debounceTimer;
    elements.searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleSearch, 400);
    });

    elements.typeFilter.addEventListener('change', () => {
        state.typeFilter = elements.typeFilter.value;
        resetPagination();
        loadPokemonForCurrentView();
    });

    elements.generationFilter.addEventListener('change', () => {
        state.generationFilter = elements.generationFilter.value;
        resetPagination();
        loadPokemonForCurrentView();
    });

    elements.clearFilters.addEventListener('click', () => {
        elements.searchInput.value = '';
        elements.typeFilter.value = '';
        elements.generationFilter.value = '';
        state.searchTerm = '';
        state.typeFilter = '';
        state.generationFilter = '';
        resetPagination();
        loadPokemonForCurrentView();
    });

    elements.prevPage.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            loadPokemonForCurrentView();
            elements.grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    elements.nextPage.addEventListener('click', () => {
        state.currentPage++;
        loadPokemonForCurrentView();
        elements.grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    elements.modalClose.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (event) => {
        if (event.target === elements.modal) closeModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });

    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    elements.themeToggle.addEventListener('click', toggleTheme);
}

function handleSearch() {
    const value = elements.searchInput.value.trim().toLowerCase();
    if (value === state.searchTerm) return;
    state.searchTerm = value;
    resetPagination();
    loadPokemonForCurrentView();
}

function switchView(view) {
    state.activeView = view;
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'compare') {
        showCompareView();
        loadPokemonForCurrentView();
    } else {
        hideCompareView();
        resetPagination();
        loadPokemonForCurrentView();
    }
}

function showCompareView() {
    elements.grid.style.display = '';
    elements.pagination.style.display = '';
    elements.compareSection.classList.remove('hidden');
    elements.grid.classList.add('compare-mode');
}

function hideCompareView() {
    elements.grid.classList.remove('compare-mode');
    elements.compareSection.classList.add('hidden');
}

function resetPagination() {
    state.currentPage = 1;
}

async function openPokemonModal(id) {
    const modalId = ++state.modalId;
    try {
        let pokemon = state.cachedPokemon[id];
        if (!pokemon) {
            pokemon = await fetchPokemonByNameOrId(id);
            if (modalId !== state.modalId) return;
            state.cachedPokemon[id] = pokemon;
        }
        const species = await fetchPokemonSpecies(id);
        if (modalId !== state.modalId) return;

        renderPokemonModal(pokemon, species, modalId);
        elements.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        if (modalId !== state.modalId) return;
        console.error(error);
        showToast('Erro ao carregar detalhes.');
    }
}

function closeModal() {
    elements.modal.classList.add('hidden');
    document.body.style.overflow = '';
}

function renderPokemonModal(pokemon, species, modalId) {
    const types = extractTypes(pokemon);
    const image = getPokemonImage(pokemon) || FALLBACK_IMAGE;
    const shinyImage = getPokemonShinyImage(pokemon) || image;
    const hasShiny = shinyImage !== image;
    const description = extractDescription(species);

    const height = `${(pokemon.height / 10).toLocaleString('pt-BR')} m`;
    const weight = `${(pokemon.weight / 10).toLocaleString('pt-BR')} kg`;
    const baseExperience = pokemon.base_experience ?? '—';

    const abilities = pokemon.abilities.map(a => ({
        name: a.ability.name.replace(/-/g, ' '),
        hidden: a.is_hidden
    }));

    const levelMoves = pokemon.moves
        .map(m => {
            const info = m.version_group_details.find(d => d.move_learn_method.name === 'level-up');
            return info ? { name: m.move.name.replace(/-/g, ' '), level: info.level_learned_at } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.level - b.level)
        .slice(0, 8);

    const moves = levelMoves.length
        ? levelMoves.map(m => `<span class="move-item">${m.name} <span class="move-level">nível ${m.level}</span></span>`).join('')
        : pokemon.moves.slice(0, 8).map(m => `<span class="move-item">${m.move.name.replace(/-/g, ' ')}</span>`).join('');

    const statNames = {
        hp: 'HP',
        attack: 'Atk',
        defense: 'Def',
        'special-attack': 'SpA',
        'special-defense': 'SpD',
        speed: 'Spe'
    };

    elements.modalBody.innerHTML = `
        <div class="modal-header">
            <span class="modal-number">#${String(pokemon.id).padStart(3, '0')}</span>
            <img class="modal-image" src="${image}" alt="${pokemon.name}" data-default="${image}" data-shiny="${shinyImage}">
            <h2 class="modal-name">${pokemon.name}</h2>
            <div class="modal-types">
                ${types.map(type => `<span class="type-badge type-${type}">${type}</span>`).join('')}
            </div>
            <div class="modal-info">
                <div class="modal-info-item">
                    <span class="modal-info-label">Altura</span>
                    <span class="modal-info-value">${height}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">Peso</span>
                    <span class="modal-info-value">${weight}</span>
                </div>
                <div class="modal-info-item">
                    <span class="modal-info-label">XP base</span>
                    <span class="modal-info-value">${baseExperience}</span>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-action-btn" id="modalFavBtn">${isFavorite(pokemon.id) ? '★ Favorito' : '☆ Favoritar'}</button>
                <button class="modal-action-btn" id="modalCompareBtn">${SCALES_ICON} Comparar</button>
                ${hasShiny ? `<button class="modal-action-btn" id="modalShinyBtn" title="Alternar versão shiny">${SPARKLE_ICON} Brilho</button>` : ''}
            </div>
        </div>
        ${abilities.length ? `
            <div class="modal-abilities">
                <h3 class="section-title">Habilidades</h3>
                <div class="ability-list">
                    ${abilities.map((a, i) => `<span class="ability-badge${a.hidden ? ' hidden-ability' : ''}" style="animation-delay:${i * 60}ms">${a.name}${a.hidden ? ' (oculta)' : ''}</span>`).join('')}
                </div>
            </div>` : ''}
        <div class="modal-moves">
            <h3 class="section-title">Movimentos</h3>
            <div class="move-list">${moves}</div>
        </div>
        <div class="modal-stats">
            ${pokemon.stats.map(stat => {
                const name = statNames[stat.stat.name] || stat.stat.name;
                const pct = Math.min((stat.base_stat / 255) * 100, 100);
                return `
                    <div class="stat-row">
                        <span class="stat-name">${name}</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar" style="width: 0%" data-width="${pct}"></div>
                        </div>
                        <span class="stat-value-display">${stat.base_stat}</span>
                    </div>
                `;
            }).join('')}
        </div>
        <p class="modal-description">"${description || 'Descrição não disponível.'}"</p>
        <div class="evolution-section">
            <h3 class="evolution-title">Evoluções</h3>
            <div class="evolution-chain" id="evolutionChain">
                <div class="loading"><p>Carregando evoluções...</p></div>
            </div>
        </div>
    `;

    document.getElementById('modalFavBtn').addEventListener('click', () => {
        toggleFavorite(pokemon.id);
        document.getElementById('modalFavBtn').textContent = isFavorite(pokemon.id) ? '★ Favorito' : '☆ Favoritar';
        refreshCardFavorites();
        updateFavoritesCount();
        showToast(`${pokemon.name} ${isFavorite(pokemon.id) ? 'adicionado aos' : 'removido dos'} favoritos`);
    });

    document.getElementById('modalCompareBtn').addEventListener('click', () => {
        closeModal();
        if (state.activeView !== 'compare') switchView('compare');
        handleCompareClick(pokemon);
    });

    const shinyBtn = document.getElementById('modalShinyBtn');
    if (shinyBtn) {
        shinyBtn.addEventListener('click', () => {
            const img = elements.modalBody.querySelector('.modal-image');
            const isShiny = img.src === img.dataset.shiny;
            img.src = isShiny ? img.dataset.default : img.dataset.shiny;
            shinyBtn.classList.toggle('active', !isShiny);
        });
    }

    requestAnimationFrame(() => {
        document.querySelectorAll('.stat-bar').forEach(bar => {
            bar.style.width = bar.dataset.width + '%';
        });
    });

    loadEvolutions(species, pokemon.id, modalId);
}

async function loadEvolutions(species, currentId, modalId) {
    const chainElement = document.getElementById('evolutionChain');
    if (!chainElement) return;

    if (!species || !species.evolution_chain) {
        chainElement.innerHTML = '<p>Sem evoluções conhecidas.</p>';
        return;
    }

    try {
        const evolutionData = await fetchEvolutionChain(species.evolution_chain.url);
        if (modalId !== state.modalId) return;

        const evolutionList = flattenEvolutionChain(evolutionData.chain);
        const items = await Promise.all(evolutionList.map(async (evo, i) => {
            const pokemon = await fetchPokemonByNameOrId(evo.id);
            const image = getPokemonImage(pokemon) || FALLBACK_IMAGE;
            const isCurrent = evo.id === currentId;
            return `
                <div class="evolution-item ${isCurrent ? 'current' : ''}" data-evo-id="${evo.id}" style="animation-delay:${i * 90}ms">
                    <img src="${image}" alt="${evo.name}">
                    <span>${evo.name}</span>
                </div>
            `;
        }));

        if (modalId !== state.modalId) return;
        chainElement.innerHTML = items.join('<span class="evolution-arrow">→</span>');

        chainElement.querySelectorAll('.evolution-item').forEach(item => {
            item.addEventListener('click', () => {
                const evoId = parseInt(item.dataset.evoId);
                if (evoId !== currentId) {
                    closeModal();
                    openPokemonModal(evoId);
                }
            });
        });
    } catch (error) {
        if (modalId !== state.modalId) return;
        chainElement.innerHTML = '<p>Erro ao carregar evoluções.</p>';
        console.error(error);
    }
}

function flattenEvolutionChain(chain) {
    const result = [];
    const walk = (node) => {
        result.push({ id: getSpeciesId(node.species.url), name: node.species.name });
        if (node.evolves_to && node.evolves_to.length > 0) {
            node.evolves_to.forEach(walk);
        }
    };
    walk(chain);
    return result;
}

function toggleTheme() {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('pokedex_theme', next);
}

function setupTheme() {
    const saved = localStorage.getItem('pokedex_theme') || 'light';
    document.documentElement.dataset.theme = saved;
}

let toastTimer;
function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 2500);
}

init();
