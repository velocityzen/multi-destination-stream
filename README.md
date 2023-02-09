# multi-destination-stream

[![NPM Version](https://img.shields.io/npm/v/multi-destination-stream.svg?style=flat-square)](https://www.npmjs.com/package/multi-destination-stream)
[![NPM Downloads](https://img.shields.io/npm/dt/multi-destination-stream.svg?style=flat-square)](https://www.npmjs.com/package/multi-destination-stream)

Transform stream to output data to mutliple destinations

# Install

`npm i multi-destination-stream`

# Usage

Here is an example that splits the input data into two destinations (writable streams) based on a number. Ones go into the writable for ones and twos go to the second writable for twos

```ts
import { pipeline } from "stream/promises";
import { createMultiDestinationStream } from "multi-destination-stream";

const stream = createMultiDestinationStream<number>({
  objectMode: true,
  getDestinationId(data) {
    return String(data);
  },
  async createNewDestination(id) {
    return new Writable({
        objectMode: true,
        write(data: number, _encoding, callback) {
          // just ignore it for example purpose
          callback();
        },
      })
    );
  },
});

await pipeline(Readable.from([1, 1, 2, 2, 1, 1, 2, 2]), stream);
```

# API

### `createMultiDestinationStream<I, O>(options: MultiDestinationStreamOptions<I>);`

returns `Duplex` stream.

#### options

- all normal Duplex stream options
- **getDestinationId: (data: I) => string** - function that returns data id, stream use this id to separate outputs
- **createNewDestination: (data: I, id: string) => Promise<Writable | Duplex>** - function to return new destination stream, called **once** per id

if `createNewDestination` returns `Duplex` this stream will pass all the outputs of all destinations into `Readable` part.

The generics:

- `I` stands for Input data type
- `O` is optional and stands for Ouput of Duplex destination type.

### `pipelineWithOutput<O>(...pipeline parameters): Promise<O[]>;`

this works exactly as [pipeline](https://nodejs.org/api/stream.html#streampipelinestreams-options) but collects all end outputs into array and returns them when pipeline is ended.

License

[MIT](LICENSE)
