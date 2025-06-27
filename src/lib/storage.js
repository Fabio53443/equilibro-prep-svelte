// Shared in-memory storage for processed CSV data
const inMemoryStorage = new Map();
const CLEANUP_DELAY = 300000; // 5 minutes in milliseconds (increased from 2 minutes)

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of inMemoryStorage.entries()) {
        if (now - data.timestamp > CLEANUP_DELAY) {
            inMemoryStorage.delete(key);
        }
    }
}, 60000); // Check every minute

export function storeData(uniqueId, data) {
    const sessionData = {
        ...data,
        timestamp: Date.now()
    };
    inMemoryStorage.set(uniqueId, sessionData);
    
    // Schedule cleanup of this specific entry
    setTimeout(() => {
        inMemoryStorage.delete(uniqueId);
    }, CLEANUP_DELAY);
}

export function getData(uniqueId) {
    const data = inMemoryStorage.get(uniqueId);
    return data;
}

export function deleteData(uniqueId) {
    inMemoryStorage.delete(uniqueId);
}

export function generateUniqueId() {
    return Math.random().toString(36).substring(2, 10);
}
