import Papa from 'papaparse';

/**
 * Parse CSV content from text
 * @param {string} csvText - The CSV content as text
 * @returns {Array} Parsed CSV data as array of objects
 */
export function parseCsv(csvText) {
    const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
    });
      if (result.errors.length > 0) {
        console.warn('Errori di parsing CSV:', result.errors);
    }
    
    return result.data;
}

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional array of header names
 * @returns {string} CSV string
 */
export function toCsv(data, headers = null) {
    if (!data || data.length === 0) return '';
    
    const config = {
        header: true
    };
    
    if (headers) {
        config.columns = headers;
    }
    
    return Papa.unparse(data, config);
}

/**
 * Process CSV data similar to the Python process_csv function
 * @param {Array} inputData - Parsed CSV data from input file
 * @param {Set|null} selectedSchools - Set of selected school codes, or null for all schools
 * @returns {Object} Object containing output1, output2, and scuoleterritorio data
 */
export function processCsvData(inputData, selectedSchools = null) {
    // Filter rows by schools if specified
    const filteredRows = inputData.filter(row => {
        return selectedSchools === null || selectedSchools.has(row.CODICESCUOLA);
    });

    // Process first output file - group by CODICEISBN
    const isbnGroups = {};
    
    filteredRows.forEach(row => {
        const isbn = row.CODICEISBN;
        if (!isbnGroups[isbn]) {
            isbnGroups[isbn] = [];
        }
        
        isbnGroups[isbn].push({
            CODICESCUOLA: row.CODICESCUOLA,
            ANNOCORSO: row.ANNOCORSO,
            SEZIONEANNO: row.SEZIONEANNO
        });
    });

    // Create output data for first file
    const output1Data = [];
    for (const [isbn, group] of Object.entries(isbnGroups)) {
        const concatValues = group.map(item => 
            `${item.CODICESCUOLA}_${item.ANNOCORSO}${item.SEZIONEANNO}`
        );
        
        output1Data.push({
            CODICEISBN: isbn,
            CODICESCUOLA_ANNOCORSO_SEZIONEANNO: concatValues.join(', ')
        });
    }

    // Process second output file - unique ISBNs with book details
    const seenIsbns = new Set();
    const output2Data = [];
    
    filteredRows.forEach(row => {
        const isbn = row.CODICEISBN;
        
        // Skip if we've already seen this ISBN
        if (seenIsbns.has(isbn)) {
            return;
        }
        
        seenIsbns.add(isbn);
        
        // Format price: convert comma to dot
        const price = row.PREZZO.replace(/"/g, '').replace(',', '.');
        
        // Create title - combine TITOLO and SOTTOTITOLO if SOTTOTITOLO is not "ND"
        let title = row.TITOLO;
        if (row.SOTTOTITOLO && row.SOTTOTITOLO !== 'ND') {
            title = `${row.TITOLO} - ${row.SOTTOTITOLO}`;
        }
        
        // Replace all commas with dashes in the title
        title = title.replace(/,/g, '-');
        
        output2Data.push({
            ISBN: isbn,
            Titolo: title,
            Materia: row.DISCIPLINA,
            Listino: price,
            EDITORE: row.EDITORE,
            'Qta tot': '',
            'Qta non venduti': ''
        });
    });

    return {
        output1: output1Data,
        output2: output2Data,
        filteredRows
    };
}

/**
 * Generate school territory data
 * @param {Array} schools - Array of school objects
 * @param {Array} selectedSchools - Array of selected school codes
 * @returns {Array} School territory data
 */
export function generateSchoolTerritoryData(schools, selectedSchools = null) {
    return schools
        .filter(school => !selectedSchools || selectedSchools.includes(school.CODICESCUOLA))
        .map(school => ({
            NomeScuola: `${school.DENOMINAZIONESCUOLA} - ${school.CODICESCUOLA}`,
            CodiceMeccanografico: school.CODICESCUOLA 
        }));
}

/**
 * Create a downloadable blob from CSV string
 * @param {string} csvString - CSV content
 * @param {string} filename - Name for the file
 * @returns {Object} Object with blob and download URL
 */
export function createDownloadBlob(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    return { blob, url, filename };
}

/**
 * Trigger download of a blob
 * @param {Object} downloadData - Object from createDownloadBlob
 */
export function triggerDownload(downloadData) {
    const link = document.createElement('a');
    link.href = downloadData.url;
    link.download = downloadData.filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL after download
    setTimeout(() => URL.revokeObjectURL(downloadData.url), 100);
}
