const consoleDiv = document.getElementById("console");
let pwd;

document.querySelector("#encryptBtn").addEventListener("click", async () => {
  const fileInput = document.querySelector("#fileInput");
  pwd = document.querySelector("#password").value;

  if (fileInput.files.length === 0) {
    log("Please select a file to decompress.");
    return;
  }

  const files = fileInput.files;
  if (files.length > 1) {
    //encryptFolder(files);
  } else {
    const file = files[0];
    log(`Selected file: ${file.name}`);
  
    if (file.name.endsWith(".zip")) {
      await encryptZip(file);
    } else if (file.name.endsWith(".tar.gz")) {
      await encryptTarGZ(file);
    } else {
      log("Unsupported file type. ");
    }
  }
});

function log(message, overwriteLast = false) {
  if (overwriteLast) {
    consoleDiv.removeChild(consoleDiv.lastChild);
  }
  let node = document.createElement("span");
  node.innerHTML = message + "<br>";
  consoleDiv.appendChild(node);
  consoleDiv.scrollTop = consoleDiv.scrollHeight;
}

async function encryptZip(file) {
  const zip = new JSZip();
  const exportZip = new JSZip();

  async function saveToZIP(file, path) {
    await exportZip.file(path, file, { binary: true });
  }
  
  const download = async () => {
    try {
      const content = await exportZip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
  
      const a = document.createElement("a");
      a.href = url;
      a.download = "file.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    }
  };
  
  try {
    log("Decompressing...");
    let dotCount = 0;
    const dotInterval = setInterval(() => {
      const dots = ".".repeat(dotCount % 4);
      log(`Decompressing${dots}`, true);
      dotCount++;
    }, 500);
    
    const fileData = await file.arrayBuffer();
    const zipContent = await zip.loadAsync(fileData);
    
    clearInterval(dotInterval);
    log("Decompression done!");

    const totalEntries = Object.keys(zipContent.files).filter(relativePath => !relativePath.endsWith('/')).length;
    let processedEntries = 0;

    for (const [relativePath, entry] of Object.entries(zipContent.files)) {
      if (!relativePath.endsWith('/')) {
        log(`- Encrypting: ${relativePath}...`);
        try {
          const entryData = await entry.async("uint8array");
          const encryptedFile = await encrypt(entryData, pwd);
          await saveToZIP(encryptedFile.encryptedData, relativePath);
          log(`  - ${relativePath} encrypted successfully.`);
        } catch (entryError) {
          log(`  - Error processing ${relativePath}: ${entryError.message}`);
        }
        processedEntries++;
        log(`Progress: ${processedEntries} of ${totalEntries}`);
      }
    }

    log("Encryption complete!");

    download();
  } catch (error) {
    log(`Error during encryption: ${error.message}`);
  }
}

async function encryptTarGZ(file) {
  const { Gunzip } = pako;
  const { Tar } = tarJs;

  async function saveToTar(file, path) {
    // Fill in here
  }
  
  const download = async () => {
    try {
      const content = await exportZip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
  
      const a = document.createElement("a");
      a.href = url;
      a.download = "file.tar.gs";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    }
  };
  
  try {
    log("Decompressing...");
    let dotCount = 0;
    const dotInterval = setInterval(() => {
      const dots = ".".repeat(dotCount % 4);
      log(`Decompressing${dots}`, true);
      dotCount++;
    }, 500);

    const fileData = await file.arrayBuffer();
    const compressedData = new Uint8Array(fileData);
    const decompressedData = Gunzip(compressedData);

    const tarEntries = Tar.parse(decompressedData);
    
    clearInterval(dotInterval);
    log("Decompression done!");

    let totalEntries = tarEntries.length;
    let processedEntries = 0;

    for (const entry of tarEntries) {
      if (!entry.isDirectory) {
        log(`- Encrypting: ${entry.fileName}...`);
        try {
          const entryData = await entry.arrayBuffer(); // Get the entry data
          const encryptedFile = await encrypt(entryData, pwd);
          await saveToTar(encryptedFile.encryptedData, entry.fileName);
          log(`  - ${entry.fileName} encrypted successfully.`);
        } catch (entryError) {
          log(`  - Error processing ${entry.fileName}: ${entryError.message}`);
        }
        processedEntries++;
        log(`Progress: ${processedEntries} of ${totalEntries}`);
      }
    }

    log("Encryption complete!");

    await download();
  } catch (error) {
    log(`Error during TAR.GZ encryption: ${error.message}`);
  }
}

async function encrypt(data, password) {
  const enc = new TextEncoder();
  const salt = window.crypto.getRandomValues(new Uint8Array(16)); // Generate random salt
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
      tagLength: 128,
    },
    aesKey,
    data
  );

  return { iv, salt, encryptedData }; // Return IV, salt, and encrypted data
}
