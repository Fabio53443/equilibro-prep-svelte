import { error } from '@sveltejs/kit';
import { getData, deleteData } from '$lib/storage.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const filename = params.filename;
      // Extract unique ID from filename
    const match = filename.match(/^(CercaListe|listelibri|scuoleterritorio)_([a-zA-Z0-9]{8})\.csv$/);
    
    
    if (!match) {
        throw error(404, 'File non trovato');
    }
    
    const [, fileType, uniqueId] = match;
    
    // Get data from the shared storage
    const sessionData = getData(uniqueId);
    
      if (!sessionData) {
        throw error(404, 'File non trovato o scaduto');
    }
    
    
    let csvContent;
    switch (fileType) {
        case 'CercaListe':
            csvContent = sessionData.output1;
            break;
        case 'listelibri':
            csvContent = sessionData.output2;
            break;
        case 'scuoleterritorio':
            csvContent = sessionData.schoolTerritory;
            break;
        default:
            throw error(404, 'File non trovato');
    }
      if (!csvContent) {
        throw error(404, 'File content not found');
    }
    
    // Don't delete data immediately - let it expire naturally after 5 minutes
    // This allows multiple downloads of different file types from the same session
    
    // Return the CSV content with appropriate headers
    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`
        }
    });
}
