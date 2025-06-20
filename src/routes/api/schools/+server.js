import { json } from '@sveltejs/kit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseCsv } from '$lib/csvProcessor.js';

let schoolsData = null;

// Load schools data on first access
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

/** @type {import('./$types').RequestHandler} */
export async function GET({ url }) {
    const schools = getSchoolsData();
    
    // Get filter parameters from URL search params
    const filters = {};
    for (const [key, value] of url.searchParams.entries()) {
        if (value) {
            filters[key] = value;
        }
    }
    
    let filtered = schools;
    
    // Apply filters (additive/OR logic like in Python version)
    for (const [key, value] of Object.entries(filters)) {
        const values = value.split('|')
            .map(v => v.trim().toLowerCase())
            .filter(v => v);
        
        if (values.length > 0) {
            filtered = filtered.filter(school => {
                const schoolValue = school[key] || '';
                return values.includes(schoolValue.toLowerCase());
            });
        }
    }
    
    return json(filtered);
}
