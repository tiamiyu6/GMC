/**
 * Low-level encode/decode helpers for the RouterOS API "word" protocol.
 * See: https://help.mikrotik.com/docs/display/ROS/API
 *
 * Every sentence is a list of length-prefixed words terminated by a
 * zero-length word. Length prefixes use a variable-width varint-like
 * encoding capped at 4 length bytes (RouterOS sentences never get close to
 * the 5-byte form in practice, but it's implemented for completeness).
 */

export function encodeLength(length: number): Buffer {
  if (length < 0x80) {
    return Buffer.from([length]);
  }
  if (length < 0x4000) {
    const adjusted = length | 0x8000;
    return Buffer.from([(adjusted >> 8) & 0xff, adjusted & 0xff]);
  }
  if (length < 0x200000) {
    const adjusted = length | 0xc00000;
    return Buffer.from([
      (adjusted >> 16) & 0xff,
      (adjusted >> 8) & 0xff,
      adjusted & 0xff,
    ]);
  }
  if (length < 0x10000000) {
    const adjusted = length | 0xe0000000;
    return Buffer.from([
      (adjusted >> 24) & 0xff,
      (adjusted >> 16) & 0xff,
      (adjusted >> 8) & 0xff,
      adjusted & 0xff,
    ]);
  }
  const buf = Buffer.alloc(5);
  buf[0] = 0xf0;
  buf.writeUInt32BE(length, 1);
  return buf;
}

export function encodeWord(word: string): Buffer {
  const body = Buffer.from(word, "utf8");
  return Buffer.concat([encodeLength(body.length), body]);
}

export function encodeSentence(words: string[]): Buffer {
  return Buffer.concat([...words.map(encodeWord), Buffer.from([0x00])]);
}

/** Incrementally consumes bytes and yields decoded words, tracking sentence boundaries. */
export class SentenceDecoder {
  private buffer: Buffer = Buffer.alloc(0);

  push(chunk: Buffer): string[][] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    const sentences: string[][] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const sentence: string[] = [];
      let offset = 0;
      let complete = true;

      while (true) {
        const lengthResult = this.readLength(offset);
        if (!lengthResult) {
          complete = false;
          break;
        }
        const { length, bytesRead } = lengthResult;
        offset += bytesRead;

        if (length === 0) {
          break; // end of sentence
        }

        if (this.buffer.length < offset + length) {
          complete = false;
          break;
        }

        sentence.push(this.buffer.subarray(offset, offset + length).toString("utf8"));
        offset += length;
      }

      if (!complete) break;

      this.buffer = this.buffer.subarray(offset);
      sentences.push(sentence);
    }

    return sentences;
  }

  private readLength(offset: number): { length: number; bytesRead: number } | null {
    if (this.buffer.length <= offset) return null;
    const first = this.buffer[offset]!;

    if ((first & 0x80) === 0x00) {
      return { length: first, bytesRead: 1 };
    }
    if ((first & 0xc0) === 0x80) {
      if (this.buffer.length < offset + 2) return null;
      const length = ((first & 0x3f) << 8) | this.buffer[offset + 1]!;
      return { length, bytesRead: 2 };
    }
    if ((first & 0xe0) === 0xc0) {
      if (this.buffer.length < offset + 3) return null;
      const length =
        ((first & 0x1f) << 16) | (this.buffer[offset + 1]! << 8) | this.buffer[offset + 2]!;
      return { length, bytesRead: 3 };
    }
    if ((first & 0xf0) === 0xe0) {
      if (this.buffer.length < offset + 4) return null;
      const length =
        ((first & 0x0f) << 24) |
        (this.buffer[offset + 1]! << 16) |
        (this.buffer[offset + 2]! << 8) |
        this.buffer[offset + 3]!;
      return { length, bytesRead: 4 };
    }
    // 0xf0 prefix: next 4 bytes are the full length
    if (this.buffer.length < offset + 5) return null;
    const length = this.buffer.readUInt32BE(offset + 1);
    return { length, bytesRead: 5 };
  }
}

export interface RosReply {
  /** e.g. "!re", "!done", "!trap", "!fatal" */
  tag: string;
  attrs: Record<string, string>;
}

export function parseWords(words: string[]): RosReply {
  const [tag, ...rest] = words;
  const attrs: Record<string, string> = {};
  for (const word of rest) {
    const eq = word.indexOf("=", 1);
    if (word.startsWith("=") && eq > 0) {
      attrs[word.slice(1, eq)] = word.slice(eq + 1);
    } else if (word.startsWith("=")) {
      attrs[word.slice(1)] = "";
    }
  }
  return { tag: tag ?? "", attrs };
}
