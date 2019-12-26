# hypersim-parser

[![Build Status](https://travis-ci.com/decentstack/hypersim-parser.svg?branch=master)](https://travis-ci.com/decentstack/hypersim-parser)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

> Streaming ndjson parser and metrics aggregator for [hyper-simulator](https://github.com/decentstack/hyper-simulator)

## <a name="install"></a> Install

```bash
npm install hypersim-parser
```

## <a name="usage"></a> Usage

```js
const { createReadStream } = require('fs')
const { BasicTimeline } = require('hypersim-parser')

const parser = new BasicTimeline()

// Register a custom aggregator
parser.pushReducer('version', (prev, { type, event, seq }) => {
  if (type !== 'custom' && event !== 'block') return 0
  return seq
})

// 'snapshot' event is emitted once for each tick in the simulation's timeline
parser.once('snapshot', (snapshot, iteration) => {
  console.log(snapshot)
  snapshot.version // contains the result the custom reducer/aggregator.
})

// 'close' is fired once all events has been traversed.
parser.once('close', () => console.log('Parsing complete'))

// The parser implements a Writable stream, and accepts
// ndjson in chunks of Buffer | Uint8Array | string

const readable = fs.createReadStream('swarm-log.json')
readable.pipe(parser)
```

## <a name="contribute"></a> Contributing

Ideas and contributions to the project are welcome. You must follow this [guideline](https://github.com/telamon/hypersim-parser/blob/master/CONTRIBUTING.md).

## License

GNU AGPLv3 © Tony Ivanov
