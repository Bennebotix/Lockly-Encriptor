async function hashFileInChunks(file) {
    const chunkSize = 1024 * 1024; // 1MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    const sha256 = new Uint8Array(32); // SHA-256 produces a 32-byte hash

    for (let currentChunk = 0; currentChunk < totalChunks; currentChunk++) {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const blob = file.slice(start, end);

        const arrayBuffer = await blob.arrayBuffer();
        const chunkHash = new Uint8Array(await crypto.subtle.digest('SHA-256', arrayBuffer));

        // XOR the current chunk hash with the accumulated hash
        for (let i = 0; i < sha256.length; i++) {
            sha256[i] ^= chunkHash[i];
        }
    }

    // Convert the final hash to a binary string
    let binaryString = '';
    for (let byte of sha256) {
        binaryString += byte.toString(2).padStart(8, '0'); // Convert each byte to a binary string
    }

    return binaryString;
}