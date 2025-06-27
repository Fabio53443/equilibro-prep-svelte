<script>
	import { onMount } from 'svelte';
	import { parseCsv } from '$lib/csvProcessor.js';

	let schools = [];
	let filteredSchools = [];
	let selectedSchools = [];
	let schoolBookData = {}; // Map of school codes to class counts
	let filters = {
		REGIONE: [],
		PROVINCIA: [],
		COMUNE: [],
		DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA: []
	};
	let filterCollapsed = {
		REGIONE: false,
		PROVINCIA: false,
		COMUNE: false,
		DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA: false
	};
	let searchQuery = '';
	let loading = false;
	let processing = false;
	let processResults = null;
	let downloadUrls = {};

	// Load schools data on component mount
	onMount(async () => {
		await loadSchools();
		await loadSchoolBookData();
	});

	async function loadSchools() {
		loading = true;
		try {
			const response = await fetch('/api/schools');
			schools = await response.json();
		} catch (error) {
			console.error('Errore nel caricamento delle scuole:', error);
		} finally {
			loading = false;
		}
	}

	async function loadSchoolBookData() {
		try {
			const response = await fetch('/api/school-book-data');
			schoolBookData = await response.json();
		} catch (error) {
			console.error('Errore nel caricamento dei dati libri:', error);
		}
	}

	// Filter schools based on search and filters - make it properly reactive
	$: filteredSchools = schools.filter(school => {
		// Apply text search
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			const searchFields = [
				school.DENOMINAZIONESCUOLA,
				school.CODICESCUOLA,
				school.COMUNE,
				school.PROVINCIA
			];
			if (!searchFields.some(field => field?.toLowerCase().includes(query))) {
				return false;
			}
		}

		// Apply dropdown filters (now supporting arrays)
		for (const [key, selectedValues] of Object.entries(filters)) {
			if (selectedValues && selectedValues.length > 0) {
				if (!selectedValues.includes(school[key])) {
					return false;
				}
			}
		}

		return true;
	});

	function toggleSchoolSelection(schoolCode) {
		if (selectedSchools.includes(schoolCode)) {
			selectedSchools = selectedSchools.filter(code => code !== schoolCode);
		} else {
			selectedSchools = [...selectedSchools, schoolCode];
		}
	}

	function selectAllFiltered() {
		const newSelections = filteredSchools
			.map(school => school.CODICESCUOLA)
			.filter(code => !selectedSchools.includes(code));
		selectedSchools = [...selectedSchools, ...newSelections];
	}

	function clearSelection() {
		selectedSchools = [];
	}

	// Multi-select filter functions
	function toggleFilterValue(filterKey, value) {
		const currentValues = filters[filterKey];
		if (currentValues.includes(value)) {
			filters[filterKey] = currentValues.filter(v => v !== value);
		} else {
			filters[filterKey] = [...currentValues, value];
		}
		
		// Clean up dependent filters to only keep valid values
		cleanupDependentFilters(filterKey);
	}

	function clearFilter(filterKey) {
		filters[filterKey] = [];
		// Clean up dependent filters after clearing this one
		cleanupDependentFilters(filterKey);
	}

	function selectAllFilter(filterKey) {
		let availableValues = [];
		
		switch (filterKey) {
			case 'REGIONE':
				availableValues = uniqueRegions;
				break;
			case 'PROVINCIA':
				availableValues = uniqueProvinces;
				break;
			case 'COMUNE':
				availableValues = uniqueCommunes;
				break;
			case 'DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA':
				availableValues = uniqueSchoolTypes;
				break;
		}
		
		filters[filterKey] = [...availableValues];
		// Clean up dependent filters after selecting all
		cleanupDependentFilters(filterKey);
	}

	function toggleFilterCollapse(filterKey) {
		filterCollapsed[filterKey] = !filterCollapsed[filterKey];
	}

	function clearAllFilters() {
		filters = {
			REGIONE: [],
			PROVINCIA: [],
			COMUNE: [],
			DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA: []
		};
	}

	async function processData() {
		processing = true;
		processResults = null;
		downloadUrls = {};

		try {
			const response = await fetch('/api/process', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					schools: selectedSchools
				})
			});

			if (response.ok) {
				processResults = await response.json();
				console.log('Process results:', processResults);
				
				// Generate download URLs
				downloadUrls = {
					output1: `/api/download/${processResults.output1}`,
					output2: `/api/download/${processResults.output2}`,
					scuoleterritorio: `/api/download/${processResults.scuoleterritorio}`
				};
				console.log('Download URLs:', downloadUrls);
			} else {
				console.error('Elaborazione fallita');
			}
		} catch (error) {
			console.error('Errore nell\'elaborazione dei dati:', error);
		} finally {
			processing = false;
		}
	}

	// Get unique values for dropdown filters with cascading logic
	function getUniqueValues(field, baseSchools = schools) {
		if (!baseSchools || baseSchools.length === 0) return [];
		const values = [...new Set(baseSchools.map(school => school[field]).filter(Boolean))];
		return values.sort();
	}

	// Get schools filtered by current selections (for cascading dropdowns)
	$: getFilteredSchoolsForCascading = () => {
		return schools.filter(school => {
			// Apply only region filter for province dropdown
			if (filters.REGIONE.length > 0 && !filters.REGIONE.includes(school.REGIONE)) {
				return false;
			}
			return true;
		});
	};

	$: getFilteredSchoolsForCommunes = () => {
		return schools.filter(school => {
			// Apply region and province filters for commune dropdown
			if (filters.REGIONE.length > 0 && !filters.REGIONE.includes(school.REGIONE)) {
				return false;
			}
			if (filters.PROVINCIA.length > 0 && !filters.PROVINCIA.includes(school.PROVINCIA)) {
				return false;
			}
			return true;
		});
	};

	$: getFilteredSchoolsForTypes = () => {
		return schools.filter(school => {
			// Apply region, province, and commune filters for school type dropdown
			if (filters.REGIONE.length > 0 && !filters.REGIONE.includes(school.REGIONE)) {
				return false;
			}
			if (filters.PROVINCIA.length > 0 && !filters.PROVINCIA.includes(school.PROVINCIA)) {
				return false;
			}
			if (filters.COMUNE.length > 0 && !filters.COMUNE.includes(school.COMUNE)) {
				return false;
			}
			return true;
		});
	};

	// Reactive variables for cascading dropdown options
	$: uniqueRegions = schools.length > 0 ? getUniqueValues('REGIONE') : [];
	$: filteredSchoolsForProvinces = getFilteredSchoolsForCascading();
	$: uniqueProvinces = schools.length > 0 ? getUniqueValues('PROVINCIA', filteredSchoolsForProvinces) : [];
	$: filteredSchoolsForCommunes = getFilteredSchoolsForCommunes();
	$: uniqueCommunes = schools.length > 0 ? getUniqueValues('COMUNE', filteredSchoolsForCommunes) : [];
	$: filteredSchoolsForTypes = getFilteredSchoolsForTypes();
	$: uniqueSchoolTypes = schools.length > 0 ? getUniqueValues('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA', filteredSchoolsForTypes) : [];

	// Clean up dependent filters to only keep valid values
	function cleanupDependentFilters(changedFilter) {
		if (changedFilter === 'REGIONE') {
			// Clean up provinces - keep only those that exist in selected regions
			const validProvinces = getUniqueValues('PROVINCIA', getFilteredSchoolsForCascading());
			filters.PROVINCIA = filters.PROVINCIA.filter(p => validProvinces.includes(p));
			
			// Clean up communes - keep only those that exist in selected regions/provinces
			const validCommunes = getUniqueValues('COMUNE', getFilteredSchoolsForCommunes());
			filters.COMUNE = filters.COMUNE.filter(c => validCommunes.includes(c));
			
			// Clean up school types
			const validTypes = getUniqueValues('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA', getFilteredSchoolsForTypes());
			filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA = filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA.filter(t => validTypes.includes(t));
		} else if (changedFilter === 'PROVINCIA') {
			// Clean up communes - keep only those that exist in selected provinces
			const validCommunes = getUniqueValues('COMUNE', getFilteredSchoolsForCommunes());
			filters.COMUNE = filters.COMUNE.filter(c => validCommunes.includes(c));
			
			// Clean up school types
			const validTypes = getUniqueValues('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA', getFilteredSchoolsForTypes());
			filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA = filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA.filter(t => validTypes.includes(t));
		} else if (changedFilter === 'COMUNE') {
			// Clean up school types - keep only those that exist in selected communes
			const validTypes = getUniqueValues('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA', getFilteredSchoolsForTypes());
			filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA = filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA.filter(t => validTypes.includes(t));
		}
	}

	async function downloadAllFiles() {
		if (!downloadUrls || !processResults) return;
		
		// Download files sequentially with a small delay between each
		const files = [
			{ url: downloadUrls.output1, name: 'CercaListe' },
			{ url: downloadUrls.output2, name: 'ListeLibri' },
			{ url: downloadUrls.scuoleterritorio, name: 'ScuoleTerritorio' }
		];
		
		for (const file of files) {
			// Create a temporary link element and click it
			const link = document.createElement('a');
			link.href = file.url;
			link.download = '';
			link.style.display = 'none';
			
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			
			// Small delay to prevent browser blocking multiple downloads
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}
</script>

<svelte:head>
	<title>Prep Equilibro 2025</title>
	<meta name="description" content="Elabora liste libri scolastiche e genera report" />
</svelte:head>

<div class="container">
	<header>
		<h1>📚 Prep Equilibro 2025</h1>
		<p>Seleziona le scuole del tuo territorio per generare i file necessari a popolare l'app del mercatino dei libri.</p>
	</header>

	<main>
		<!-- Sezione Filtri Scuole -->
		<section class="filter-section">
			<h2>🏫 Selezione Scuole</h2>
			
			<!-- Ricerca e Filtri -->
			<div class="search-filters">
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Cerca scuole per nome, codice, città..."
					class="search-input"
				/>

				<div class="filter-sections">
					<!-- Pulsante Cancella Tutti i Filtri -->
					<div class="filter-controls">
						<button on:click={clearAllFilters} class="btn btn-secondary">
							Cancella Tutti i Filtri
						</button>
					</div>

					<!-- Filtro Regioni -->
					<div class="filter-group">
						<div class="filter-header" on:click={() => toggleFilterCollapse('REGIONE')} on:keydown={(e) => e.key === 'Enter' && toggleFilterCollapse('REGIONE')} role="button" tabindex="0">
							<div class="filter-header-left">
								<span class="filter-toggle-icon" class:collapsed={filterCollapsed.REGIONE}>▼</span>
								<h4>Regioni ({filters.REGIONE.length} selezionate)</h4>
							</div>
							<div class="filter-header-buttons">
								<button on:click|stopPropagation={() => selectAllFilter('REGIONE')} class="btn-select-all">Seleziona Tutto</button>
								<button on:click|stopPropagation={() => clearFilter('REGIONE')} class="btn-clear">Cancella</button>
							</div>
						</div>
						{#if !filterCollapsed.REGIONE}
							<div class="filter-options">
								{#each uniqueRegions as region}
									<label class="filter-option">
										<input
											type="checkbox"
											checked={filters.REGIONE.includes(region)}
											on:change={() => toggleFilterValue('REGIONE', region)}
										/>
										{region}
									</label>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Filtro Province -->
					<div class="filter-group" class:disabled={filters.REGIONE.length === 0}>
						<div class="filter-header" on:click={() => toggleFilterCollapse('PROVINCIA')} on:keydown={(e) => e.key === 'Enter' && toggleFilterCollapse('PROVINCIA')} role="button" tabindex="0">
							<div class="filter-header-left">
								<span class="filter-toggle-icon" class:collapsed={filterCollapsed.PROVINCIA}>▼</span>
								<h4>Province ({filters.PROVINCIA.length} selezionate)</h4>
							</div>
							<div class="filter-header-buttons">
								<button on:click|stopPropagation={() => selectAllFilter('PROVINCIA')} class="btn-select-all" disabled={filters.REGIONE.length === 0}>Seleziona Tutto</button>
								<button on:click|stopPropagation={() => clearFilter('PROVINCIA')} class="btn-clear">Cancella</button>
							</div>
						</div>
						{#if filters.REGIONE.length === 0}
							<div class="filter-disabled-message">
								Seleziona prima una regione per filtrare le province
							</div>
						{:else if !filterCollapsed.PROVINCIA}
							<div class="filter-options">
								{#each uniqueProvinces as provincia}
									<label class="filter-option">
										<input
											type="checkbox"
											checked={filters.PROVINCIA.includes(provincia)}
											on:change={() => toggleFilterValue('PROVINCIA', provincia)}
										/>
										{provincia}
									</label>
								{/each}
							</div>
						{/if}
					</div>					<!-- Filtro Città -->
					<div class="filter-group" class:disabled={filters.REGIONE.length === 0 && filters.PROVINCIA.length === 0}>
						<div class="filter-header" on:click={() => toggleFilterCollapse('COMUNE')} on:keydown={(e) => e.key === 'Enter' && toggleFilterCollapse('COMUNE')} role="button" tabindex="0">
							<div class="filter-header-left">
								<span class="filter-toggle-icon" class:collapsed={filterCollapsed.COMUNE}>▼</span>
								<h4>Città ({filters.COMUNE.length} selezionate)</h4>
							</div>
							<div class="filter-header-buttons">
								<button on:click|stopPropagation={() => selectAllFilter('COMUNE')} class="btn-select-all" disabled={filters.REGIONE.length === 0 && filters.PROVINCIA.length === 0}>Seleziona Tutto</button>
								<button on:click|stopPropagation={() => clearFilter('COMUNE')} class="btn-clear">Cancella</button>
							</div>
						</div>
						{#if filters.REGIONE.length === 0 && filters.PROVINCIA.length === 0}
							<div class="filter-disabled-message">
								Seleziona prima una regione o provincia per filtrare le città
							</div>
						{:else if !filterCollapsed.COMUNE}
							<div class="filter-options">
								{#each uniqueCommunes as comune}
									<label class="filter-option">
										<input
											type="checkbox"
											checked={filters.COMUNE.includes(comune)}
											on:change={() => toggleFilterValue('COMUNE', comune)}
										/>
										{comune}
									</label>
								{/each}
							</div>
						{/if}
					</div>					<!-- Filtro Tipi di Scuola -->
					<div class="filter-group" class:disabled={filters.REGIONE.length === 0 && filters.PROVINCIA.length === 0 && filters.COMUNE.length === 0}>
						<div class="filter-header" on:click={() => toggleFilterCollapse('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA')} on:keydown={(e) => e.key === 'Enter' && toggleFilterCollapse('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA')} role="button" tabindex="0">
							<div class="filter-header-left">
								<span class="filter-toggle-icon" class:collapsed={filterCollapsed.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA}>▼</span>
								<h4>Tipi di Scuola ({filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA.length} selezionati)</h4>
							</div>
							<div class="filter-header-buttons">
								<button on:click|stopPropagation={() => selectAllFilter('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA')} class="btn-select-all" disabled={filters.REGIONE.length === 0 && filters.PROVINCIA.length === 0 && filters.COMUNE.length === 0}>Seleziona Tutto</button>
								<button on:click|stopPropagation={() => clearFilter('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA')} class="btn-clear">Cancella</button>
							</div>
						</div>
						{#if filters.REGIONE.length === 0 && filters.PROVINCIA.length === 0 && filters.COMUNE.length === 0}
							<div class="filter-disabled-message">
								Seleziona prima una località per filtrare i tipi di scuola
							</div>
						{:else if !filterCollapsed.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA}
							<div class="filter-options">
								{#each uniqueSchoolTypes as type}
									<label class="filter-option">
										<input
											type="checkbox"
											checked={filters.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA.includes(type)}
											on:change={() => toggleFilterValue('DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA', type)}
										/>
										{type}
									</label>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Azioni di Selezione -->
			<div class="selection-actions">
				<button on:click={selectAllFiltered} class="btn btn-secondary">
					Seleziona Tutti i Filtrati ({filteredSchools.length})
				</button>
				<button on:click={clearSelection} class="btn btn-secondary">
					Cancella Selezione
				</button>
				<span class="selection-count">
					{selectedSchools.length} scuole selezionate
				</span>
			</div>

			<!-- Lista Scuole -->
			{#if loading}
				<div class="loading">Caricamento scuole...</div>
			{:else}
				<div class="schools-list">
					{#each filteredSchools as school}
						<div class="school-item">
							<label class="school-label">
								<input
									type="checkbox"
									checked={selectedSchools.includes(school.CODICESCUOLA)}
									on:change={() => toggleSchoolSelection(school.CODICESCUOLA)}
								/>
								<div class="school-info">
									<div class="school-name">
										{school.DENOMINAZIONESCUOLA}
										{#if schoolBookData[school.CODICESCUOLA]}
											<span 
												class="book-indicator has-data" 
												title="Scuola con dati libri - {schoolBookData[school.CODICESCUOLA]} classi"
											>
												🟢
											</span>
										{:else}
											<span 
												class="book-indicator no-data" 
												title="Scuola senza dati libri"
											>
												🔴
											</span>
										{/if}
									</div>
									<div class="school-details">
										<span class="school-code">{school.CODICESCUOLA}</span>
										<span class="school-location">{school.COMUNE}, {school.PROVINCIA}</span>
										<span class="school-type">{school.DESCRIZIONETIPOLOGIAGRADOISTRUZIONESCUOLA}</span>
									</div>
								</div>
							</label>
						</div>
					{/each}
				</div>
			{/if}
		</section>

		<!-- Sezione Elaborazione -->
		<section class="process-section">
			<h2>⚙️ Elabora Dati</h2>
			<button
				on:click={processData}
				disabled={processing}
				class="btn btn-primary process-btn"
			>
				{#if processing}
					🔄 Elaborazione in corso...
				{:else}
					📊 Elabora Dati
				{/if}
			</button>

			{#if processResults}
				<div class="results">
					<h3>✅ Elaborazione Completata!</h3>
					<p>I tuoi file sono stati generati e sono pronti per il download:</p>
					
					<div class="download-links">
						<button on:click={downloadAllFiles} class="btn btn-download btn-download-all">
							📦 Scarica Tutti i File
						</button>
						
						<div class="individual-downloads">
							<a href={downloadUrls.output1} download class="btn btn-download">
								📋 Scarica CercaListe (Gruppi ISBN)
							</a>
							<a href={downloadUrls.output2} download class="btn btn-download">
								📚 Scarica ListeLibri (Dettagli Libri)
							</a>
							<a href={downloadUrls.scuoleterritorio} download class="btn btn-download">
								🏫 Scarica ScuoleTerritorio (Info Scuole)
							</a>
						</div>
					</div>
					
					<p class="expiry-notice">
						⏰ I file scadranno automaticamente dopo 2 minuti per sicurezza.
					</p>
				</div>
			{/if}
		</section>
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background-color: #f8fafc;
		color: #334155;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		color: #1e293b;
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	h2 {
		color: #1e293b;
		font-size: 1.5rem;
		margin-bottom: 1rem;
		border-bottom: 2px solid #e2e8f0;
		padding-bottom: 0.5rem;
	}

	section {
		background: white;
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.search-filters {
		margin-bottom: 1.5rem;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.filter-sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.filter-controls {
		grid-column: 1 / -1;
		text-align: center;
		margin-bottom: 1rem;
	}

	.filter-group {
		border: 1px solid #e2e8f0;
		border-radius: 8px;
		overflow: hidden;
	}

	.filter-group.disabled {
		opacity: 0.6;
	}

	.filter-group.disabled .filter-header {
		background: #f1f5f9;
		color: #9ca3af;
	}

	.filter-disabled-message {
		padding: 1rem;
		text-align: center;
		color: #6b7280;
		font-style: italic;
		font-size: 0.875rem;
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}

	.filter-header {
		background: #f8fafc;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e2e8f0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		cursor: pointer;
		transition: background-color 0.2s ease;
		user-select: none;
	}

	.filter-header:hover {
		background: #f1f5f9;
	}

	.filter-header:focus {
		outline: 2px solid #3b82f6;
		outline-offset: -2px;
	}

	.filter-header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.filter-toggle-icon {
		font-size: 0.75rem;
		transition: transform 0.2s ease;
		color: #6b7280;
	}

	.filter-toggle-icon.collapsed {
		transform: rotate(-90deg);
	}

	.filter-header h4 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #475569;
	}

	.filter-header-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.btn-select-all {
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		border: none;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		transition: all 0.2s ease;
		box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.btn-select-all:hover:not(:disabled) {
		background: linear-gradient(135deg, #059669, #047857);
		transform: translateY(-1px);
		box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
	}

	.btn-select-all:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 3px rgba(16, 185, 129, 0.3);
	}

	.btn-select-all:disabled {
		background: #d1d5db;
		color: #9ca3af;
		cursor: not-allowed;
		transform: none;
		box-shadow: none;
	}

	.btn-clear {
		background: none;
		border: 1px solid #fecaca;
		color: #dc2626;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		padding: 0.375rem 0.75rem;
		border-radius: 6px;
		transition: all 0.2s ease;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.btn-clear:hover {
		background: #fef2f2;
		border-color: #f87171;
		color: #b91c1c;
		transform: translateY(-1px);
	}

	.btn-clear:active {
		transform: translateY(0);
	}

	.filter-disabled-message {
		padding: 1rem;
		text-align: center;
		color: #6b7280;
		font-style: italic;
		font-size: 0.875rem;
		background: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}

	.filter-options {
		max-height: 200px;
		overflow-y: auto;
		padding: 0.5rem;
	}

	.filter-option {
		display: flex;
		align-items: center;
		padding: 0.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
		font-weight: normal;
	}

	.filter-option:hover {
		background: #f1f5f9;
	}

	.filter-option input[type="checkbox"] {
		margin-right: 0.5rem;
		margin-top: 0;
	}

	.selection-actions {
		display: flex;
		gap: 1rem;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.selection-count {
		color: #059669;
		font-weight: 500;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		text-align: center;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-primary:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #e2e8f0;
	}

	.btn-secondary:hover {
		background: #e2e8f0;
	}

	.btn-download {
		background: #059669;
		color: white;
	}

	.btn-download:hover {
		background: #047857;
	}

	.download-links {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.btn-download-all {
		background: #7c3aed;
		font-size: 1.1rem;
		font-weight: 600;
		padding: 1rem 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(124, 58, 237, 0.1);
	}

	.btn-download-all:hover {
		background: #6d28d9;
		transform: translateY(-1px);
		box-shadow: 0 6px 8px rgba(124, 58, 237, 0.2);
	}

	.individual-downloads {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}

	.individual-downloads .btn-download {
		font-size: 0.9rem;
		padding: 0.75rem 1.25rem;
	}

	.schools-list {
		max-height: 400px;
		overflow-y: auto;
		border: 1px solid #e2e8f0;
		border-radius: 8px;
	}

	.school-item {
		border-bottom: 1px solid #f1f5f9;
	}

	.school-item:last-child {
		border-bottom: none;
	}

	.school-label {
		display: flex;
		align-items: center;
		padding: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.school-label:hover {
		background: #f8fafc;
	}

	.school-label input[type="checkbox"] {
		margin-right: 1rem;
		transform: scale(1.2);
	}

	.school-info {
		flex: 1;
	}

	.school-name {
		font-weight: 600;
		color: #1e293b;
		margin-bottom: 0.25rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.book-indicator {
		font-size: 0.75rem;
		cursor: help;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.book-indicator.has-data {
		background-color: rgba(34, 197, 94, 0.1);
	}

	.book-indicator.no-data {
		background-color: rgba(239, 68, 68, 0.1);
	}

	.school-details {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: #64748b;
		flex-wrap: wrap;
	}

	.school-code {
		font-family: monospace;
		background: #f1f5f9;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.process-btn {
		font-size: 1.125rem;
		padding: 1rem 2rem;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #64748b;
	}

	.results {
		margin-top: 2rem;
		padding: 1.5rem;
		background: #f0f9ff;
		border-radius: 8px;
		border: 1px solid #0ea5e9;
	}

	.results h3 {
		color: #0c4a6e;
		margin-bottom: 1rem;
	}

	.download-links {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.btn-download-all {
		background: #7c3aed;
		font-size: 1.1rem;
		font-weight: 600;
		padding: 1rem 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(124, 58, 237, 0.1);
	}

	.btn-download-all:hover {
		background: #6d28d9;
		transform: translateY(-1px);
		box-shadow: 0 6px 8px rgba(124, 58, 237, 0.2);
	}

	.individual-downloads {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
	}

	.individual-downloads .btn-download {
		font-size: 0.9rem;
		padding: 0.75rem 1.25rem;
	}

	@media (max-width: 768px) {
		.container {
			padding: 1rem;
		}

		h1 {
			font-size: 2rem;
		}

		section {
			padding: 1rem;
		}

		.filter-sections {
			grid-template-columns: 1fr;
		}

		.selection-actions {
			flex-direction: column;
			align-items: stretch;
		}

		.download-links {
			flex-direction: column;
		}

		.individual-downloads {
			flex-direction: column;
		}

		.school-details {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>
