import { json } from '@sveltejs/kit';
import { parseCsv, processCsvData, generateSchoolTerritoryData, toCsv } from '$lib/csvProcessor.js';
import { storeData, generateUniqueId } from '$lib/storage.js';
import { readFileSync } from 'fs';
import { join } from 'path';

let schoolsData = null;
let inputData = null;

// Load schools data
function getSchoolsData() {
    if (!schoolsData) {
        try {
            const schoolsPath = join(process.cwd(), 'static', 'scuolelazio.csv');
            const schoolsCsv = readFileSync(schoolsPath, 'utf-8');
            schoolsData = parseCsv(schoolsCsv);        } catch (error) {
            console.error('Errore nel caricamento dei dati delle scuole:', error);
            schoolsData = [];
        }
    }
    return schoolsData;
}

// Load input data
function getInputData() {
    if (!inputData) {
        try {
            // Try to load from the parent directory first
            let inputPath = join(process.cwd(), '..', 'input.csv');
            try {
                const inputCsv = readFileSync(inputPath, 'utf-8');
                inputData = parseCsv(inputCsv);
            } catch (error) {
                // If that fails, try the static folder
                inputPath = join(process.cwd(), 'static', 'input.csv');
                const inputCsv = readFileSync(inputPath, 'utf-8');
                inputData = parseCsv(inputCsv);
            }        } catch (error) {
            console.error('Errore nel caricamento dei dati di input:', error);
            inputData = [];
        }
    }
    return inputData;
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        const { schools: selectedSchools } = await request.json();
        
        // Generate unique ID for this processing session
        const uniqueId = generateUniqueId();
        
        // Always use default input data
        const inputCsvData = getInputData();
        const schools = getSchoolsData();
        
        // Convert selected schools to Set for faster lookup
        const schoolsSet = selectedSchools && selectedSchools.length > 0 
            ? new Set(selectedSchools) 
            : null;
        
        // Process the CSV data
        const { output1, output2 } = processCsvData(inputCsvData, schoolsSet);
        
        // Generate school territory data
        const schoolTerritoryData = generateSchoolTerritoryData(schools, selectedSchools);
          // Convert to CSV strings
        const output1Csv = toCsv(output1);
        const output2Csv = toCsv(output2);
        const schoolTerritoryCsv = toCsv(schoolTerritoryData, ['NomeScuola', 'CodiceMeccanografico']);
          // Store in memory
        const sessionData = {
            output1: output1Csv,
            output2: output2Csv,
            schoolTerritory: schoolTerritoryCsv
        };
        
        storeData(uniqueId, sessionData);
        
        console.log('Stored data for uniqueId:', uniqueId);
        
        return json({
            zipFile: `equilibro_files_${uniqueId}.zip`,
            unique_id: uniqueId
        });
        
    } catch (error) {
        console.error('Errore di elaborazione:', error);
        return json({ error: 'Elaborazione fallita' }, { status: 500 });
    }
}
