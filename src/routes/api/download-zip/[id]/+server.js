import { error } from '@sveltejs/kit';
import { getData } from '$lib/storage.js';
import archiver from 'archiver';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const { id } = params;
    
    // Extract the unique ID from the filename (remove .zip extension)
    const uniqueId = id.replace('.zip', '');
    
    try {
        // Retrieve the stored data
        const sessionData = getData(uniqueId);
        
        if (!sessionData) {
            throw error(404, 'File non trovato o scaduto');
        }
        
        // Create a new archiver instance
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        // Create a readable stream for the response
        const stream = new ReadableStream({
            start(controller) {
                // Handle archiver events
                archive.on('error', (err) => {
                    console.error('Archive error:', err);
                    controller.error(err);
                });
                
                archive.on('data', (chunk) => {
                    controller.enqueue(new Uint8Array(chunk));
                });
                
                archive.on('end', () => {
                    controller.close();
                });
                
                // Add files to the archive
                archive.append(sessionData.output1, { name: `CercaListe_${uniqueId}.csv` });
                archive.append(sessionData.output2, { name: `ListeLibri_${uniqueId}.csv` });
                archive.append(sessionData.schoolTerritory, { name: `ScuoleTerritorio_${uniqueId}.csv` });
                
                // Finalize the archive
                archive.finalize();
            }
        });
        
        return new Response(stream, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="equilibro_files_${uniqueId}.zip"`
            }
        });
        
    } catch (err) {
        console.error('Errore nel download del file zip:', err);
        throw error(500, 'Errore interno del server');
    }
}
