import { createWriteStream } from "fs";
import { unlink, readFile } from "fs/promises";
import { pipeline } from "stream/promises";
import { Readable, Writable } from "stream";
import { createMultiDestinationStream } from "../lib";

describe("multiDestinationStream data and error handling", () => {
  test("conform data", async () => {
    const input = [1, 1, 2, 2, 1, 1, 2, 2];
    const stream = createMultiDestinationStream<number>({
      writableObjectMode: true,
      getDestinationId(data) {
        return String(data);
      },
      createNewDestination(data) {
        return Promise.resolve(createWriteStream(`./tests/${data}`));
      },
    });

    await pipeline(Readable.from(input), stream);

    const data1 = await readFile("./tests/1", { encoding: "utf-8" });
    const data2 = await readFile("./tests/2", { encoding: "utf-8" });
    expect(data1).toBe("1111");
    expect(data2).toBe("2222");

    await unlink("./tests/1");
    await unlink("./tests/2");
  });

  test("read errors destroy all destinations", async () => {
    const writtenData: Record<number, number[]> = {};
    const destinations: Writable[] = [];

    const input = [1, 1, 2, 2, 1, -1, 2, 2];
    const streamWithError = new Readable({
      objectMode: true,
      highWaterMark: 1,
      read() {
        const chunk = input.shift();
        if (chunk === -1) {
          this.destroy(new Error("Stop"));
        } else {
          setTimeout(() => {
            this.push(chunk ?? null);
          }, 64);
        }
      },
    });

    const stream = createMultiDestinationStream<number>({
      objectMode: true,
      getDestinationId(data) {
        return String(data);
      },
      createNewDestination(id) {
        const destination = new Writable({
          objectMode: true,
          highWaterMark: 1,
          write(data: number, _encoding, callback) {
            (writtenData[id] || (writtenData[id] = [])).push(data);
            callback();
          },
        });

        destinations.push(destination);

        return Promise.resolve(destination);
      },
    });

    try {
      await pipeline(streamWithError, stream);
      expect(true).toBe(false);
    } catch (e) {
      expect(writtenData[1]).toEqual([1, 1, 1]);
      expect(writtenData[2]).toEqual([2, 2]);

      destinations.forEach((destination) => {
        expect(destination.writable).toBe(false);
      });
    }
  });

  test("create destination error", async () => {
    const writtenData: Record<number, number[]> = {};
    const destinations: Writable[] = [];

    const input = [1, 1, 2, 2, 1, -1, 2, 2];

    const stream = createMultiDestinationStream<number>({
      objectMode: true,
      getDestinationId(data) {
        return String(data);
      },
      createNewDestination(id) {
        if (id === 2) {
          return Promise.reject(new Error("Failed to create destination"));
        }

        const destination = new Writable({
          objectMode: true,
          highWaterMark: 1,
          write(data: number, _encoding, callback) {
            (writtenData[id] || (writtenData[id] = [])).push(data);
            callback();
          },
        });

        destinations.push(destination);
        return Promise.resolve(destination);
      },
    });

    try {
      await pipeline(Readable.from(input), stream);
      expect(true).toBe(false);
    } catch (e) {
      expect(writtenData[1]).toEqual([1, 1]);
      expect(writtenData[2]).toBeUndefined();

      destinations.forEach((destination) => {
        expect(destination.writable).toBe(false);
      });
    }
  });
});
