import { Writable, Duplex, DuplexOptions } from "stream";

import { isReadable, conformData } from "./helpers";

type StreamDefaultDataType = string | Buffer | Uint8Array;

export interface MultiDestinationStreamOptions<
  I = StreamDefaultDataType,
  ID extends string = string,
> extends DuplexOptions {
  getDestinationId: (data: I) => ID;
  createNewDestination: (data: I, id: ID) => Promise<Writable | Duplex>;
}

export function createMultiDestinationStream<
  I = StreamDefaultDataType,
  O = StreamDefaultDataType,
  ID extends string = string,
>({
  getDestinationId,
  createNewDestination,
  ...options
}: MultiDestinationStreamOptions<I, ID>): Duplex {
  const destinations: Record<string, Writable | Duplex> = {};

  const stream = new Duplex({
    ...options,
    allowHalfOpen: true,
    // input
    write(data: I, encoding, callback) {
      const id = getDestinationId(data);
      const destination = destinations[id];

      if (destination) {
        destination.write(
          conformData(destination, data, encoding),
          encoding,
          callback,
        );
        return;
      }

      createNewDestination(data, id)
        .then((destination) => {
          destinations[id] = destination;
          destination.on("error", destroy);
          destination.write(
            conformData(destination, data, encoding),
            encoding,
            callback,
          );

          if (isReadable(destination)) {
            destination
              .on("data", (chunk: O) => {
                stream.push(chunk);
              })
              .on("end", endOutput);
          }
        })
        .catch((e) => destroy(e as Error, callback));
    },

    //output
    read() {
      // if destinations are readable forward the data
      // implementation is in destination.on("data") handler
    },
  });

  stream.on("error", destroy);
  stream.on("finish", finishInput);

  // to end output (reading)
  function endOutput() {
    const isDoneReadings = Object.values(destinations).every((destination) => {
      if (!isReadable(destination)) {
        return true;
      }

      return !destination.readable;
    });

    if (isDoneReadings) {
      stream.push(null);
    }
  }

  // to finish input (writing)
  function finishInput() {
    Object.values(destinations).forEach((destination) => destination?.end());
  }

  function destroy(
    error?: Error,
    callback?: (error: Error | null | undefined) => void,
  ) {
    Object.values(destinations).forEach(
      (destination) => destination?.destroy(),
    );

    if (callback) {
      callback(error);
    } else {
      stream.destroy(error);
    }
  }

  return stream;
}
