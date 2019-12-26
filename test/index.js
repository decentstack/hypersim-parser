const test = require('tape')
const { BasicTimeline, TimelineAggregator } = require('..')
const fs = require('fs')

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
