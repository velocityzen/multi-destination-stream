import { pipeline } from "stream/promises";
import { Writable, PipelineOptions } from "stream";
import { isIterable, isNodeStream } from "./helpers";

type Pipeline = Parameters<typeof pipeline>;

export async function pipelineWithOutput<O>(
  ...streams: Pipeline
): Promise<O[]> {
  const output: O[] = [];
  const outputCollectorStream = new Writable({
    objectMode: true,
    write(data: O, _encoding, callback) {
      output.push(data);
      callback();
    },
  });

  const more: (Writable | PipelineOptions)[] = [outputCollectorStream];

  const lastArg = streams[streams.length - 1];
  if (
    lastArg &&
    typeof lastArg === "object" &&
    !isNodeStream(lastArg) &&
    !isIterable(lastArg)
  ) {
    more.push(streams.pop() as PipelineOptions);
  }

  await pipeline(...streams, ...more);

  return output;
}
