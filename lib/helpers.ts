import { Writable, Readable, Stream } from "stream";

export function isReadable(stream: Writable | Readable): stream is Readable {
  return Boolean("readable" in stream);
}

export function isNodeStream(obj: unknown): obj is Stream {
  return obj instanceof Stream;
}

const SymbolAsyncIterator = Symbol.asyncIterator;
const SymbolIterator = Symbol.iterator;

export function isIterable(obj: unknown, isAsync = false): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  if (isAsync === true) {
    return SymbolAsyncIterator in obj;
  }

  if (isAsync === false) {
    return SymbolIterator in obj;
  }

  return SymbolAsyncIterator in obj || SymbolIterator in obj;
}

export function conformData<I>(
  stream: Writable,
  data: I,
  encoding: BufferEncoding,
) {
  if (stream.writableObjectMode) {
    return data;
  }

  return Buffer.from(String(data), encoding);
}
