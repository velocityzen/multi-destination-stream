import { pipeline } from "stream/promises";
import { Writable, Readable, Duplex } from "stream";
import { createMultiDestinationStream, pipelineWithOutput } from "../lib";

describe("multiDestinationStream", () => {
  test("writable destinations", async () => {
    const outputStreamsIds: number[] = [];
    const stream = createMultiDestinationStream<number>({
      objectMode: true,
      getDestinationId(data) {
        return String(data);
      },
      createNewDestination(id) {
        outputStreamsIds.push(id);

        return Promise.resolve(
          new Writable({
            objectMode: true,
            write(data: number, _encoding, callback) {
              expect(data).toBe(id);
              callback();
            },
          })
        );
      },
    });

    await pipeline(Readable.from([1, 1, 2, 2, 1, 1, 2, 2]), stream);

    expect(outputStreamsIds).toEqual([1, 2]);
  });

  test("duplex destinations", async () => {
    const transform = createMultiDestinationStream<number, number>({
      objectMode: true,
      getDestinationId(data) {
        return String(data);
      },
      createNewDestination(id) {
        let counter = 0;
        const destination = new Duplex({
          objectMode: true,
          allowHalfOpen: true,
          write(data: number, _encoding, callback) {
            expect(data).toBe(id);
            counter += data;
            callback();
          },

          read() {
            // read is in destination.on("finish") handler
          },
        });

        destination.on("finish", () => {
          destination.push(counter);
          setTimeout(() => {
            destination.push(null);
          }, counter * 100);
        });

        return Promise.resolve(destination);
      },
    });

    const output = await pipelineWithOutput<number>(
      Readable.from([1, 1, 2, 2, 1, 1, 2, 2]),
      transform
    );

    expect(output).toEqual([4, 8]);
  });
});
