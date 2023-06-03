import AsarCreator from "./asar.js";

/**
 * Builds a Replugged-compatible theme manifest from a BD theme.
 * @param {string} css CSS string to parse into a manifest.
 * @param {string} filename Name of the .theme.css file
 * @returns {object} Replugged theme manifest
 */
function buildManifest(css, filename) {
  // Parse meta comment
  const fields = new Map();
  const meta = css.match(/^\s*\/\*\*\s*[\s\S]+?(?=\*\/)/)?.[0]; // entire meta
  if (meta) {
    // New meta
    const lines = meta.matchAll(/\s*\*\s*@([a-zA-Z]+)\s*(.*)/g); // individual meta lines
    for (const match of lines) {
      fields.set(match[1], match[2].trim());
    }
  } else {
    // Old meta
    const oldMeta = css.match(/(?<=\/\/META).+?(?=\*\/\/)/)[0];
    return JSON.parse(oldMeta)
  }
  
  // Build Replugged theme manifest
  const manifest = {
    id: "bd.theme." + filename.split(".").slice(0, -2).join(".")
  };
  
  for (const key of ["name", "description", "version"]) {
    if (fields.has(key)) {
      manifest[key] = fields.get(key);
    }
  }
  
  if (fields.has("author")) {
    manifest.author = {
      name: fields.get("author")
    }
    
    if (fields.has("authorId")) {
      manifest.author.discordID = fields.get("authorId");
    }
  }
  
  manifest.type = "replugged-theme";
  manifest.main = filename;
  manifest.license = "Unknown";
  manifest.bdMeta = Object.fromEntries(fields);
  
  return manifest;
}

/**
 * Creates an asar for a CSS file and the manifest.
 * @param {string} css CSS of the BD theme
 * @param {object} manifest Manifest for the Replugged theme
 * @returns {Blob} Blob representing the theme asar.
 */
function createAsar(css, manifest) {
  const asar = new AsarCreator();

  // Add the manifest to the asar
  asar.addFile("manifest.json",
               new TextEncoder().encode(JSON.stringify(manifest)).buffer);

  // Add the CSS to the asar
  asar.addFile(manifest.main, new TextEncoder().encode(css).buffer);

  // Return the asar as a blob
  return asar.exportBlob();
}

/**
 * Downloads a file to the user's file system.
 * @param {Blob} file file to download as a Blob
 * @param {string} name Filename
 */
function downloadFile(file, name) {
  // Thank you random blog guy
  // https://www.delftstack.com/howto/javascript/javascript-download/
  const linkElem = document.createElement("a");
  linkElem.href = URL.createObjectURL(file);
  linkElem.setAttribute("download", name);
  document.body.appendChild(linkElem);
  linkElem.click();
  document.body.removeChild(linkElem);
}

/**
 * Converts a BD .theme.css file to a Replugged theme asar and downloads it.
 * @param {File} input Blob containing the input .theme.css File object.
 */
export async function convertTheme(input) {
  const css = await input.text();
  const manifest = buildManifest(css, input.name);
  const asar = createAsar(css, manifest);
  downloadFile(asar, `${manifest.id}.asar`);
}