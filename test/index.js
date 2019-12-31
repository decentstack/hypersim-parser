const test = require('tape')
const { Parser, BasicTimeline, TimelineAggregator } = require('..')
const fs = require('fs')

const testChunks = [
  '{"iteration":0,"msg":"He',
  'llo"}\n{"iteration":1,"m',
  'sg":"world"}\n{"iteration":2,"msg":"twice"}',
  '\n{"iteration":3,"msg":"fold"}'
]

test('ndjson as strings', t => {
  t.plan(8)
  const validate = ({ iteration, msg }) => {
    switch (iteration) {
      case 0:
        t.equal(msg, 'Hello', 'pass' + iteration)
        break
      case 1:
        t.equal(msg, 'world', 'pass' + iteration)
        break
      case 2:
        t.equal(msg, 'twice', 'pass' + iteration)
        break
      case 3:
        t.equal(msg, 'fold', 'pass' + iteration)
        break
      default:
        t.fail('Unknown state: ' + iteration)
    }
  }

  const parser = new Parser({ process: validate })
  parser.once('close', t.end)
  const feed = i => {
    if (i >= testChunks.length) return parser.end()
    const chunk = testChunks[i]
    parser._write(chunk, err => {
      t.error(err)
      feed(i + 1)
    })
  }
  feed(0)
})

test('ndjson as Buffers', t => {
  t.plan(8)
  const validate = ({ iteration, msg }) => {
    switch (iteration) {
      case 0:
        t.equal(msg, 'Hello', 'pass' + iteration)
        break
      case 1:
        t.equal(msg, 'world', 'pass' + iteration)
        break
      case 2:
        t.equal(msg, 'twice', 'pass' + iteration)
        break
      case 3:
        t.equal(msg, 'fold', 'pass' + iteration)
        break
      default:
        t.fail('Unknown state: ' + iteration)
    }
  }

  const parser = new Parser({ process: validate })
  parser.once('close', t.end)
  const feed = i => {
    if (i >= testChunks.length) return parser.end()
    const chunk = Buffer.from(testChunks[i])
    parser._write(chunk, err => {
      t.error(err)
      feed(i + 1)
    })
  }
  feed(0)
})

test('ndjson as Uint8Arrays', t => {
  t.plan(8)
  const validate = ({ iteration, msg }) => {
    switch (iteration) {
      case 0:
        t.equal(msg, 'Hello', 'pass' + iteration)
        break
      case 1:
        t.equal(msg, 'world', 'pass' + iteration)
        break
      case 2:
        t.equal(msg, 'twice', 'pass' + iteration)
        break
      case 3:
        t.equal(msg, 'fold', 'pass' + iteration)
        break
      default:
        t.fail('Unknown state: ' + iteration)
    }
  }
  const parser = new Parser({ process: validate })
  parser.once('close', t.end)
  const feed = i => {
    if (i >= testChunks.length) return parser.end()
    const chunk = new Uint8Array(Buffer.from(testChunks[i]))
    parser._write(chunk, err => {
      t.error(err)
      feed(i + 1)
    })
  }
  feed(0)
})

test.skip('Parser + TimelineAggregator', t => {
  const parser = new TimelineAggregator()
  parser.once('snapshot', (snapshot, i) => {
    t.equal(typeof snapshot, 'object')
    t.equal(snapshot.iteration, i)
    t.equal(typeof i, 'number')
    t.equal(snapshot.blocks, 1)
  })

  parser.setReducer('blocks', (prev, { type, event, seq }) => {
    // if (type !== 'custom' && event !== 'block') return
    return (prev || 0) + 1
  })

  parser.once('close', t.end)

  const readable = fs.createReadStream('swarm-log.json')
  readable.pipe(parser)
})

test.skip('Basic Timeline', t => {
  const parser = new BasicTimeline()
  parser.on('snapshot', (snapshot, i) => {
    switch (i) {
      case 0:
        t.ok(typeof snapshot.info, 'object')
        t.ok(Array.isArray(snapshot.nodes))
        t.ok(Array.isArray(snapshot.links))
        break
      case 30:
        debugger
        break
    }
  })

  parser.once('close', t.end)
  const readable = fs.createReadStream('swarm-log.json')
  readable.pipe(parser)
})
