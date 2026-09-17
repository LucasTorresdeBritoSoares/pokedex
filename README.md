# Pokédex

Uma Pokédex completa construída com **HTML, CSS e JavaScript puro**, consumindo a [PokéAPI](https://pokeapi.co/). Projeto feito para portfólio, com foco em boas práticas de organização de código, consumo de API REST e UX.

![Funcionalidades](https://img.shields.io/badge/status-conclu%C3%ADdo-brightgreen)

## 🚀 Demo

**Online:** [lucastorresdebritosoares.github.io/pokedex](https://lucastorresdebritosoares.github.io/pokedex/)

Para visualizar localmente:

```bash
# na pasta do projeto
python -m http.server 8000
```

Acesse [http://localhost:8000](http://localhost:8000).

> A PokéAPI exige que o projeto seja servido via HTTP (não abre direto pelo `file://` em alguns navegadores). Qualquer servidor estático simples serve: `npx serve`, Live Server do VS Code, etc.

## ✨ Funcionalidades

- **Lista completa** com paginação (1.351 Pokémon, 9 gerações)
- **Busca** por nome ou número, com debounce para evitar requisições em excesso
- **Filtros** por tipo e geração, combináveis
- **Detalhes** em modal: stats com barras animadas, descrição e cadeia de evolução clicável
- **Favoritos** persistidos no `localStorage`
- **Comparação** de dois Pokémon por total de stats
- **Modo escuro** persistido no `localStorage`
- Layout **responsivo** para desktop, tablet e mobile

## 🧰 Stack

| Camada | Tecnologia |
| ------ | ---------- |
| Linguagem | JavaScript (ES6+) |
| Estrutura | HTML5 semântico |
| Estilo | CSS3 com variáveis e Grid/Flexbox |
| API | PokéAPI v2 (REST) |
| Persistência | localStorage |

## 📁 Estrutura do projeto

```
├── index.html           # Estrutura da página
├── css/
│   └── style.css        # Estilos, tema claro/escuro, responsividade
└── js/
    ├── api.js           # Camada de acesso à PokéAPI
    ├── favorites.js     # Gestão de favoritos (localStorage)
    ├── compare.js       # Lógica de comparação
    └── app.js           # Estado, renderização e interações
```

## 🔌 API

Todos os dados vêm da [PokéAPI v2](https://pokeapi.co/):

- `GET /pokemon?offset=X&limit=Y` — listagem paginada
- `GET /pokemon/{id|nome}` — detalhes de um Pokémon
- `GET /pokemon-species/{id}` — espécie, descrição e cadeia de evolução
- `GET /type/{tipo}` — Pokémon por tipo

Os limites por geração (`GEN_LIMITS`) estão centralizados em `js/api.js`.

## 🗂️ Organização do código

As responsabilidades foram separadas em módulos:

- **`api.js`** — apenas fetch e normalização de dados. O restante do app nunca chama a PokéAPI diretamente.
- **`app.js`** — estado global (`state`), renderização de cards/modal e eventos.
- **`favorites.js`** — regras de favoritos isoladas do DOM.
- **`compare.js`** — estado da comparação e cálculo de resultados.

Isso mantém cada arquivo pequeno e testável de forma independente.

## 💡 Decisões de implementação

- **Busca por número**: o input aceita tanto nome quanto ID. Como a PokéAPI ordena por ID, números são resolvidos diretamente.
- **Filtro de tipo via API**: ao filtrar por tipo, a busca usa o endpoint `/type/{tipo}` em vez de carregar a lista inteira — mais eficiente que filtrar tudo no cliente.
- **Cache em memória**: Pokémon já buscados ficam em `state.cachedPokemon`, evitando requisições repetidas ao abrir o modal.
- **Gerações**: os offsets de cada geração são constantes (`GEN_LIMITS`), baseadas nos intervalos oficiais de IDs.

## 🧪 Testes

A aplicação foi validada em Chrome headless cobrindo:

- carregamento da listagem e paginação
- busca por nome e por ID
- filtros por tipo e geração
- abertura do modal, stats e evoluções
- favoritar/desfavoritar e persistência
- comparação entre dois Pokémon
- alternância de tema
- layout mobile

## 👤 Autor

**Lucas Torres** — lucas_torres_01@outlook.com | [GitHub](https://github.com/LucasTorresdeBritoSoares) | [Controle de Gastos (full stack)](https://github.com/LucasTorresdeBritoSoares/controle-de-gastos)
