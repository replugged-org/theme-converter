/**
 * Class that creates an asar and exports it to a blob.
 */
export default class AsarCreator {
  offset = 0n;
  files = [];
  header = {
    files: {}
  };

  /**
   * Adds a file to the asar.
   * @param {string} name File name.
   * @param {ArrayBuffer} file File to add to the asar.
   */
  addFile(name, file) {
    // This implementation doesn't support a nested folder structure--not needed

    // Apparently Electron doesn't actually care about the hash, so yay
    const hash = "";
    this.header.files[name] = {
      offset: String(this.offset),
      size: file.byteLength,
      integrity: {
        algorithm: "SHA256",
        hash,
        blockSize: file.byteLength,
        blocks: [hash]
      }
    };
    this.files.push(file);
    this.offset += BigInt(file.byteLength);
  }

  /**
   * Exports the asar's contents as a Blob, to be downloaded by the user.
   * @returns {Blob} Blob representing the asar.
   */
  exportBlob() {
    /*
      Order of an asar file, in excruciating detail:
      1. Header size pickle
        i. Payload byte length (sizeof(uint32)) [4 bytes]
        ii. Header pickle byte length [4 bytes]
      2. Header pickle
        i. Payload byte length (sizeof(uint32) + string length) [4 bytes]
        ii. Header string byte length (uint32) [4 bytes]
        iii. Header string (UTF-8)
      3. Files concatenated
    */

    // Uint8Array containing the text of the header
    const headerBuf = new TextEncoder().encode(JSON.stringify(this.header));
    /*
      We're going to cheat a little bit: instead of grouping the header pickle's
      payload size and header byte length with the header string like the
      official package does, under the hood, we'll put them with the header size.
      The bytes are consecutive anyway, so this doesn't affect the output.
    */
    const headerSizeBuf = new ArrayBuffer(16);
    const headerSizeView = new DataView(headerSizeBuf);
    // Write the size of the header size in bytes (uint32 => 4)
    headerSizeView.setUint32(0, 4, true);
    // Write the size of the header pickle object in bytes (including the size uint32)
    headerSizeView.setUint32(4, headerBuf.byteLength + 8, true);

    // Technically these next two should be part of the header's Pickle object
    // ...but I don't care, the bytes are consecutive anyway
    // Header pickle payload byte length
    headerSizeView.setUint32(8, headerBuf.byteLength + 4, true);
    // Header string byte length
    headerSizeView.setUint32(12, headerBuf.byteLength, true);
    
    // Concatenate everything into one blob and return
    return new Blob([headerSizeBuf, headerBuf, ...this.files]);
  }
}